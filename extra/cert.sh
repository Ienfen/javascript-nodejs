#!/bin/bash

# -fill "#7F0000" -gravity center -pointsize 280  -draw "text 100,-100 'Кантор Илья Александрович'" test.jpg
# -fill black -pointsize 120 -annotate +1800+3200 '(30 ак.ч. семинаров, 10 ак.ч. лекций, 30 ак.ч. дом.заданий)' \
#  jpg:-
convert cert-blank.jpg -font /js/javascript-nodejs/extra/font/calibri.ttf -pointsize 140 \
 -annotate +1800+2100 'Настоящим удостоверяется, что с 14.05.2015 по 15.06.2015' \
 -fill "#7F0000" -pointsize 280 -annotate +1800+2500 'Кантор Илья Александрович' \
 -fill black -pointsize 140 -annotate +1800+2800 'прошёл(а) обучение по программе' \
 -fill black -pointsize 140 -annotate +1800+3000 'Курс "JavaScript,DOM,интерфейсы"' \
  test.jpg
