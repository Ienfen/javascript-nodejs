const {
  SlackUser,
  SlackChannel,
  SlackMessage
} = require('slack');

const LANG = require('config').lang;
const moment = require('momentWithLocale');
const MarkdownIt = require('markdown-it');

function deentitize(str) {
    return str
      .replace(/&gt;/g, '>')
      .replace(/&lt;/g, '<')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, '&');
};

function getMentionedUsers(messages) {
  return messages
    .map(({ text }) => {

      // "<@U0BM1CGQY|calvinchanubc> has joined the channel" | "<@U0BM1CGQY>"
      if (text.includes('<@U')) return text.match(/<@(U\d\w+)/)[1];

      return false;
    })
    .filter(Boolean);
}

function insertEmoji(text) {
  const unsupportedIcons = {
    'slightly_smiling_face': 'smile'
  };

  return text.replace(/(?::)([a-z_]+)(?::)/g,
   (_, i) => `<i class="em em-${unsupportedIcons[i] || i}"></i>`
  );
}

function insertLink(text) {
  return `<a href="#" class="chat-messages__mention">${text}</a>`;
}

function* parseMessages(messages) {
  const userIds = getMentionedUsers(messages);
  let users;

  if (userIds.length) {
    users = yield SlackUser.find({ userId: { $in: userIds } });
  }

  // we have messages like a plain array but need to get this structure:
  // messages: [
  //   { date: 'September 7, 2016', messages: [] },
  //   { date: 'September 8, 2016', messages: [] }
  // ]

  const parsedMessages = messages.reduce((hash, message) => {
    const messageDate = moment(message.date);

    const formattedDate = messageDate.format('MMMM D, YYYY');
    if (!hash[formattedDate]) {
      hash[formattedDate] = [];
    }

    let { text: formatedText } = message;

    formatedText = deentitize(formatedText);

    // handle user mention
    if (formatedText.includes('<@U')) {

      const userId = formatedText.match(/<@(U\d\w+)/)[1];
      const user = users.find(({ userId }) => userId === userId);

      if (user)
        formatedText = formatedText.replace(/<@U.*>/, insertLink(`@${user.name}`));
    }

    // handle channel mention
    if (formatedText.includes('<#C')) {
      const channelName = formatedText.match(/<#C.*\|(.*)>/)[1];

      if (channelName)
        formatedText = formatedText.replace(/<#C.*>/, insertLink(`#${channelName}`));
    }

    // convert bold
    formatedText = formatedText.replace(/( |^)(\*{1}[^*]+\*{1})( |$)/g, ' *$2* ');

    // convert italic
    formatedText = formatedText.replace(/( |^)\_{1}([^*]+)\_{1}( |$)/g, ' *$2* ');

    // convert crossed out
    formatedText = formatedText.replace(/( |^)(\~{1}[^*]+\~{1})( |$)/g, ' ~$2~ ');

    // escape remaining hashtags
    formatedText = formatedText.replace('#', '//#');

    const md = MarkdownIt({
      html:         false,        // Enable HTML tags in source
      breaks:       true,        // Convert '\n' in paragraphs into <br>
      linkify:      true,        // Autoconvert URL-like text to links
      typographer:  true,

      quotes:       LANG == 'ru' ? '«»„“' : '“”‘’'
    });

    formatedText = md.render(formatedText);
    // convert emoji
    formatedText = insertEmoji(formatedText);

    /*
      user: 'kuzroman',
      date: 'Sep 11, 2016 21:21',
      message: '))) Корня, сорян'
    */

    hash[formattedDate].push({
      user: message.author.realName,
      date: messageDate.format('MMM D, YYYY HH:mm'),
      message: formatedText
    });

    return hash;
  }, {});

  return Object.keys(parsedMessages).map(date => {
    return {
      date,
      messages: parsedMessages[date]
    }
  });
};

exports.parseMessages = parseMessages;
