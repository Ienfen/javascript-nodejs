module.exports = function*(user) {

  return {
    sections: [{
      title: 'Панель преподавателя',
      links: [
        { url: '/courses/teacher/instructions', title: 'Инструкции'},
        { url: '/courses/teacher/group-create', title: 'Открытие группы'},
        { url: '/courses/teacher/groups', title: 'Финансы'},
      ]
    }, {
      title: 'Рассылки',
      links: [
        { url: '/newsletter/admin/newsletter-releases', title: 'Список рассылок'},
        { url: '/newsletter/admin/newsletter-templates', title: 'Шаблоны рассылок'},
      ]
    }]
  };

};
