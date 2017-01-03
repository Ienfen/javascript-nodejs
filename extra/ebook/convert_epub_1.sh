#!/bin/bash

/Applications/calibre.app/Contents/MacOS/ebook-convert 1.html 1.epub --embed-all-fonts --max-toc-links 0 --level1-toc '//h:h2' --level2-toc '//h:h3' --authors "Ilya Kantor" --publisher "Ilya Kantor" --language ru --title "Язык JavaScript" --cover cover1.png

# fix epub icon font paths in CSS and add fonts
rm -rf 1
mkdir 1
unzip 1.epub -d 1
gsed -i 's/\/pack\/styles\/blocks\/font/font/g' 1/page_styles.css
cp -r font 1/
cd 1
zip -r ../1.epub *
cd ..