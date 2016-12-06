module.exports = {
  bold: {
    original: '*bold*',
    converted: '<p><strong>bold</strong></p>\n'
  },
  boldInsideString: {
    original: 'string that contains *bold text*',
    converted: '<p>string that contains <strong>bold text</strong></p>\n'
  },

  // skip cause we need to detect slack **text** and prevent markdown it
  // at the same time we should convert *text* to **text**

  // pseudoBold: {
  //   original: '**bold?**',
  //   converted: '<p>**bold?**</p>\n',
  // },

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
    converted: '<p><s>tildes</s></p>\n'
  },
  strikethroughInsideString: {
    original: 'string that contains ~tildes~ text',
    converted: '<p>string that contains <s>tildes</s> text</p>\n'
  },

  multiline: {
    original: 'multiline \ntext',
    converted: '<p>multiline<br>\ntext</p>\n'
  },

  html: {
    original: '<h1>heading</h1>',
    converted: '<p>&lt;h1&gt;heading&lt;/h1&gt;</p>\n'
  },

  code: {
    original: '```const a = 5;```',
    converted: '<p><code>const a = 5;</code></p>\n'
  }
};
