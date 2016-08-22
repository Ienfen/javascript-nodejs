module.exports = {
  bold: {
    original: '*bold*',
    converted: '<p><strong>bold</strong></p>\n'
  },
  boldInsideString: {
    original: 'string that contains *bold text**',
    converted: '<p>string that contains <strong>bold text</strong>*</p>\n'
  },

  italic: {
    original: '_italic_',
    converted: '<p><em>italic</em></p>\n'
  },
  italicInsideString: {
    original: 'string that contains _italic text_',
    converted: '<p>string that contains <em>italic text</em></p>\n'
  },

  strikethrough: {
    original: '~tildes~',
    converted: '<p>~tildes~</p>\n'
  },
  strikethroughInsideString: {
    original: 'string that contains ~tildes~ text',
    converted: '<p>string that contains ~tildes~ text</p>\n'
  },

  multiline: {
    original: 'multiline \ntext',
    converted: '<p>multiline<br>\ntext</p>\n'
  }
};
