#!/usr/local/bin/node

var execSync = require('child_process').execSync;

var books = {
  js:   {
    mnemo:    'js',
    title:    "Язык JavaScript",
    pageFrom: 1,
    pageTo:   3
  },
  ui:   {
    mnemo:    'ui',
    title:    "Документ, события, интерфейсы",
    pageFrom: 1,
    pageTo:   2
  },
  more: {
    mnemo:    'more',
    title:    "Дополнительно",
    pageFrom: 1,
    pageTo:   3
  }
};

var run;
switch (process.argv[2]) {
case 'epub':
  run = epub;
  break;
case 'pdf':
  run = pdf;
  break;
case 'zip':
  run = zip;
  break;
case 'zipAll':
  run = zipAll;
  break;
case 'default':
  throw new Error("Unknown command: " + process.argv[2]);
}

if (run != zipAll && !books[process.argv[3]]) {
  throw new Error("No such book " + process.argv[3]);
}

console.log("Processing", process.argv[2], process.argv[3]);

function exec(cmd, options) {
  console.log('->', cmd);
  options = options || {};
  options.stdio = options.stdio || 'inherit';
  options.maxBuffer = options.maxBuffer || 1024 * 1024;

  execSync(cmd, options);
}

function epub(book) {
  var mnemo = book.mnemo;
  exec(`/Applications/calibre.app/Contents/MacOS/ebook-convert work/${mnemo}.html work/${mnemo}.epub --embed-all-fonts --max-toc-links 0 --level1-toc '//h:h2' --level2-toc '//h:h3' --authors "Ilya Kantor" --publisher "Ilya Kantor" --language ru --title "${book.title}" --cover cover-${mnemo}.png`);

  // fix epub icon font paths in CSS and add fonts
  exec(`rm -rf work/${mnemo}`);
  exec(`mkdir work/${mnemo}`);
  exec(`unzip work/${mnemo}.epub -d work/${mnemo}`);
  exec(`gsed -i 's/\\/pack\\/styles\\/blocks\\/font/font/g' work/${mnemo}/page_styles.css`);
  exec(`cp -r font work/${mnemo}/`);
  exec(`pwd`, {
    cwd: `work/${mnemo}`
  });
  exec(`zip -r ../${mnemo}.epub *`, {
    cwd: `work/${mnemo}`
  });
}

function pdf(book) {
  var mnemo = book.mnemo;
  exec(`java -jar pdfoutline.jar --input work/${mnemo}.pdf --output work/${mnemo}.out.pdf --cover cover-${mnemo}.pdf --pageFrom ${book.pageFrom} --pageTo ${book.pageTo} --widthTolerance 20 --startLinkNumber 2`);
}

function zip(book) {
  var mnemo = book.mnemo;
  exec(`rm -rf work/${mnemo}`);
  exec(`mkdir work/${mnemo}`);
  exec(`cp work/${mnemo}.out.pdf work/${mnemo}/${mnemo}.pdf`);
  exec(`cp work/${mnemo}.epub work/${mnemo}/${mnemo}.epub`);
  exec(`zip -r ${mnemo} ${mnemo}`, { cwd: 'work' });
}

function zipAll() {
  for(var mnemo in books) {
    zip(books[mnemo]);
  }

  exec(`rm -rf work/tutorial`);
  exec(`mkdir work/tutorial`);

  var i = 1;
  for(var mnemo in books) {
    exec(`cp -r work/${mnemo} work/tutorial/${i++}`);
  }

  exec(`zip -r tutorial tutorial`, { cwd: 'work' });


  exec(`rm -rf work/js-ui`);
  exec(`mkdir work/js-ui`);

  exec(`cp -r work/js work/js-ui/1`);
  exec(`cp -r work/ui work/js-ui/2`);
  exec(`zip -r js-ui js-ui`, { cwd: 'work' });
}


run(books[process.argv[3]]);
