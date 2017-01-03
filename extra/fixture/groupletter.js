const mongoose = require('mongoose');

var Newsletter = require('newsletter').Newsletter;
var Subscription = require('newsletter').Subscription;

exports.Newsletter = [
  {
    "_id": "543250000005400000000002",
    title: "Курс JavaScript/DOM/Интерфейсы 14.05",
    slug:  "js-1405-2",
    weight: 1
  }
];

//var emails = "kporozov@yandex.ru,artuhorn@gmail.com,berkut-corp@yandex.ru,pkadrov@gmail.com,akilbekov@gmail.com,hellios.4register@gmail.com,merkushin@gmail.com,d.s.golubtsov@gmail.com,p.ivanov.spb@gmail.com,info.ivanovas@gmail.com,antongorshenin@gmail.com,bezbam@gmail.com,alexei.zhuravski@gmail.com,inspired8080@gmail.com,romanski007@gmail.com,marat.ravilevich@gmail.com,ivan.kharpalev@gmail.com,M4xT@mail.ru,larisa.gizhitskaya@gmail.com,guryanova.maria@gmail.com,misthenko@gmail.com,os.kozub@yandex.ru,kapishon-kapishon@rambler.ru,nuzhdovdenis1@gmail.com,konstantin.agafonov@gmail.com,vailo.mc@gmail.com,4ais.leo@gmail.com,rakauskased@gmail.com,cavnav@gmail.com,raawak@gmail.com,fakelesss@gmail.com,olga.yellowflowers@gmail.com,dadubinin@gmail.com,fotex2000@gmail.com,karavaev.evgeniy@gmail.com,konstantin.japan@gmail.com,molotok2302@gmail.com,e-skvortsova@mail.ru,itneee@gmail.com,grigory.novikov@gmail.com".split(',')
var emails = ["iliakan@gmail.com"];


exports.Subscription = emails.map(function(email) {
  return {
    newsletters: [{_id: '543250000005400000000002'}],
    email: email
  };
});

// gulp db:load --from extra/fixture/groupletter.js
// gulp newsletter:createLetters --slug js-1405-2 --templatePath extra/js-1405-2.jade --subject 'Курс JavaScript: новый движок' --test iliakan@gmail.com --nounsubscribe
// gulp newsletter:send
