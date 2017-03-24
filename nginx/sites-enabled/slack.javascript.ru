# Disable cloudflare!
# Does not support websocket except for enterprise

<% if (lang == 'ru') { %>

server {

  listen 80;

  <% if (sslEnabled) { %>
  listen 443 ssl spdy;

  ssl_certificate		<%=certDir%>/slack.javascript.ru/ssl.pem;
  ssl_certificate_key	<%=certDir%>/slack.javascript.ru/ssl.key;
  ssl_trusted_certificate <%=certDir%>/slack.javascript.ru/trusted.pem;

  # Temporarily allow mirroring, until all search engines understand the new site structure
  # so there won't be 301 -> 404
  # ~3 months?
  # add_header Strict-Transport-Security "max-age=31536000; includeSubdomains;";
  <% } %>

  server_name slack.javascript.ru slack.javascript.in;

  access_log  /var/log/nginx/slack.javascript.ru.log main;

  add_header X-Content-Type-Options nosniff;

  include "partial/error-pages";

<% if (setPassword) { %>
  auth_basic "Administrator Login";
  auth_basic_user_file /etc/nginx.passwd;
<% } %>

  location / {
    proxy_pass http://127.0.0.1:3001;
    proxy_redirect off;
    proxy_buffering off;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Nginx-Geo $geoip_country_code;
    proxy_set_header Host $http_host;
    proxy_read_timeout 3600;
    proxy_send_timeout   90;
    proxy_connect_timeout 5;
  }

}

<% } %>
