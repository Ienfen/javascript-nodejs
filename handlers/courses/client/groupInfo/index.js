
var notification = require('client/notification');
var Spinner = require('client/spinner');
var xhr = require('client/xhr');

initSlackInvite();

function initSlackInvite() {

  var form = document.querySelector('[data-slack-invite-form]');

  form.onsubmit = function(event) {
    event.preventDefault();
    const request = xhr({
      method: 'POST',
      url: form.action,
      normalStatuses: [200, 403],
      body: {}
    });

    var submitButton = form.querySelector('[type="submit"]');

    var spinner = new Spinner({
      elem: submitButton,
      size: 'small'
    });
    spinner.start();
    submitButton.disabled = true;

    function onEnd() {
      spinner.stop();
      submitButton.disabled = false;
    }

    request.addEventListener('loadend', onEnd);

    request.addEventListener('success', function(event) {
      if (this.status == 403) {
        new notification.Error(event.result.error);
      } else {
        new notification.Success(event.result.message);
      }

    });


  };
}