
exports.post = function*() {

  this.groupBySlug.isFinished = true;
  yield this.groupBySlug.save();
  
  this.body = {
    message: `Группа ${this.groupBySlug.title} успешно завершена.`
  };

};