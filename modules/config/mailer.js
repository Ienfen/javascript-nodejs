var secret = require('./secret');

module.exports = {
  transport: 'aws', // 'gmail', 'aws'
  senders:  {
    // transactional emails, register/forgot pass etc
    default:  {
      fromEmail: 'notify@javascript.ru',
      fromName:  'JavaScript.ru',
      signature: "<em>С уважением,<br>Илья Кантор</em>"
    },
    // important emails about orders
    orders:   {
      fromEmail: 'orders@javascript.ru',
      fromName:  'JavaScript.ru',
      signature: "<em>С уважением,<br>Илья Кантор</em>"
    },
    // newsletters
    informer: {
      fromEmail: 'informer@javascript.ru',
      fromName:  'JavaScript.ru',
      signature: "<em>Успешной разработки!<br>Илья Кантор</em>"
    }
  },

  sqs: {
    queueUrl: 'https://sqs.us-east-1.amazonaws.com/784793887268/email-queue'
  }

};
