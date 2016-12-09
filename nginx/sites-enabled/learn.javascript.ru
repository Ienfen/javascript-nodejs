# Main host
# For home dev I use in DNS: javascript.in
# For prod it's learn.javascript.ru

server {

  listen 80;

  <% if (sslEnabled) { %>
  listen 443 ssl spdy;

  ssl_certificate		<%=certDir%>/learn.javascript.ru/ssl.pem;
  ssl_certificate_key	<%=certDir%>/learn.javascript.ru/ssl.key;
  ssl_trusted_certificate <%=certDir%>/learn.javascript.ru/trusted.pem;

  # Temporarily allow mirroring, until all search engines understand the new site structure
  # so there won't be 301 -> 404
  # ~3 months?
  # add_header Strict-Transport-Security "max-age=31536000; includeSubdomains;";
  <% } %>

  server_name learn.javascript.ru yuri.javascript.ru learn.javascript.info javascript.in site.com localhost;

  # do we really need these urls secure?
  #if ($scheme = http) {
  #  rewrite ^/ebook($|/.*) https://$host$request_uri permanent;
  #  rewrite ^/courses/signup($|/.*) https://$host$request_uri permanent;
  #}

  access_log  /var/log/nginx/learn.javascript.ru.log main;

  root         <%=root%>/public;

  # js.cx
  add_header X-Frame-Options SAMEORIGIN;
  add_header X-Content-Type-Options nosniff;

  include "partial/error-pages";

<% if (setPassword) { %>
  auth_basic "Administrator Login";
  auth_basic_user_file /etc/nginx.passwd;
<% } %>

  if ($migrate) {
      return 301 $migrate;
  }

  # ^~ don't check regexps locations if prefix matches
  location ^~ /_download/ {
    internal;
    alias   <%=root%>/download/;
  }

  # restricted download (download module)
  location ^~ /download/ {
    include "partial/proxy-3000";
  }

  # restricted download (courses module)
  location ^~ /courses/download/ {
    include "partial/proxy-3000";
  }

  # zip for plunk
  location ^~ /tutorial/zipview/ {
    include "partial/proxy-3000";
  }


  # payments and dynamically generated invoices
  # no static used (yet)
  location ^~ /payments/ {
    include "partial/proxy-3000";
  }

  # agreement download
  location ^~ /courses/teacher/agreement/ {
    include "partial/proxy-3000";
  }


  # no . and folder/ -> try folder/index.html first, then @node
  location ~ ^(?<uri_no_dot>[^.]*?)/$ {
    try_files $uri_no_dot/index.html @node;
  }

  # no . and not folder/ -> @node
  location ~ ^[^.]*$ {
    if (-f <%=root%>/.maintenance) {
      return 503;
    }
    include "partial/proxy-3000";
  }

  location @node {
    if (-f <%=root%>/.maintenance) {
      return 503;
    }

    include "partial/proxy-3000";
  }

  # play directory has old plays (big, so moved out of project)
  location ~ ^/play/(.*\.zip)$ {
    alias   /js/play/$1;
  }

  # screencast for download (big, so moved out of project)
  location ~ ^/screencast/(.*\.(mp4|zip))$ {
    alias   /js/screencast/$1;
  }

  include "partial/javascript-static";

}

