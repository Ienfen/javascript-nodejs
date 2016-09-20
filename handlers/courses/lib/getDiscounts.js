"use strict";

const Discount = require('payments').Discount;
const Course = require('../models/course');
const CourseGroup = require('../models/courseGroup');
const Order = require('payments').Order;
const CourseParticipant = require('../models/courseParticipant');
const uniqWith = require('lodash/uniqWith');

module.exports = function*({
  user,
  course, // course
  group,  // OR group
  discountCode
}) {

  if (group && !course) {
    course = group.course;
  }

  let discounts = [];

  // First, get discount by code
  // (it lets person pass into closed group)
  if (discountCode) {
    let discount = yield* Discount.findByCodeAndModule(discountCode, 'courses');
    // check group OR course against slug
    if (discount) {
      if (group) {
        if (!discount.data.slug.test(group.slug)) discount = null;
      } else if (course) {
        if (!discount.data.slug.test(course.slug)) discount = null;
      }
    }
    if (discount) {
      discounts.push(discount);
    }
  }

  // Second, discount by previous courses

  if (user) {
    let allUserOrders = yield Order.find({
      user:   user._id,
      module: 'courses',
      status: Order.STATUS_SUCCESS
    });

    let allUserGroupIds1 = allUserOrders.map(o => o.data.group);

    let allUserParticipants = yield CourseParticipant.find({
      user:     user._id,
      isActive: true
    }).populate('group');

    let allUserGroupIds2 = allUserParticipants.map(p => p.group);

    let allUserGroupIds = uniqWith([].concat(allUserGroupIds1, allUserGroupIds2), (a, b) => a.equals(b));

    // all user groups where he ordered or participanted
    let allUserGroups = yield CourseGroup.find({
      _id: {
        $in: allUserGroupIds
      }
    });

    // all user courses
    let allUserCourses = yield Course.find({
      _id: {
        $in: allUserGroups.map(g => g.course)
      }
    });

    if (course.slug == 'angular2') {
      let slugs = allUserCourses.map(c => c.slug);
      if (slugs.includes('typescript') || slugs.includes('angular')) {
        let courseDiscount = new Discount({
          discount: 0.9,
          module:   'courses',
          description: 'Скидка предоставлена <a href="mailto:EMAIL">EMAIL</a> как участнику предыдущего курса по ' +
                       (slugs.includes('typescript') ? 'TypeScript' : 'Angular'),
          isActive: true
        });

        discounts.push(courseDiscount);
      }
    }
  }

  return discounts;
};
