var angular = require('angular');
var notification = require('client/notification');
var profile = angular.module('profile');

profile.controller('ProfileCourseGroupsCtrl', ($scope, $http, courseGroups) => {

  $scope.courseGroups = courseGroups;


  $scope.finishGroup = function(group) {
    $http({
      method: 'POST',
      url: '/courses/groups/' + group.slug + '/finish-group',
      headers:          {'Content-Type': undefined},
      transformRequest: angular.identity
    }).then((response) => {
      new notification.Success(response.data.message);
  
      group.isFinished = true;
    }, (response) => {
      if (response.status == 403) {
        new notification.Error(response.data.error);
      } else {
        new notification.Error("Ошибка загрузки, статус " + response.status);
      }
    })
  }
  
});
