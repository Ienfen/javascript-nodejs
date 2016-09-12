const {
  SlackUser,
  SlackChannel,
  SlackMessage
} = require('slack');

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

function insertLink(text) {
  return `<a href="#" class="chat-messages__mention">${text}</a>`;
}

function* parseMessages(messages) {
  const userIds = getMentionedUsers(messages);
  let users;

  if (userIds.length) {
    users = yield SlackUser.find({ userId: { $in: userIds } });
  }

  return messages.map(message => {
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
    formatedText = formatedText.replace(/(\*{1}[^*]+\*{1})/g, '*$1*');

    // convert italic
    formatedText = formatedText.replace(/\_{1}([^*]+)\_{1}/g, '*$1*');

    // convert crossed out
    formatedText = formatedText.replace(/(\~{1}[^*]+\~{1})/g, '~$1~');

    // escape remaining hashtags
    formatedText = formatedText.replace('#', '//#');

    const md = MarkdownIt({
      html:         false,        // Enable HTML tags in source
      breaks:       true,        // Convert '\n' in paragraphs into <br>
      linkify:      true,        // Autoconvert URL-like text to links

      quotes:       '«»„“'
    });

    return Object.assign(message, { text: md.render(formatedText) });

  });
};

exports.parseMessages = parseMessages;
