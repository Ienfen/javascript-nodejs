#!/bin/bash

/Applications/calibre.app/Contents/MacOS/ebook-convert 2.html 2.epub --embed-all-fonts --max-toc-links 0 --level1-toc '//h:h2' --level2-toc '//h:h3' --authors "Ilya Kantor" --publisher "Ilya Kantor" --language ru --title "Документ, события, интерфейсы" --cover cover2.png

# fix epub icon font paths in CSS and add fonts
rm -rf 2
mkdir 2
unzip 2.epub -d 2
gsed -i 's/\/pack\/styles\/blocks\/font/font/g' 2/page_styles.css
cp -r font 2/
cd 2
zip -r ../2.epub *
cd ..