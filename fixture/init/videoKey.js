const mongoose = require('mongoose');
var oid = require('oid');

var VideoKey = require('videoKey').VideoKey;

exports.VideoKey = [
  {
    key: 'J1',
    tag: 'js',
    project: oid('project'),
    used: true,
  },
  {
    key: 'J2',
    tag: 'js',
    project: oid('project'),
    used: true,
  },
  {
    key: 'J3',
    tag: 'js',
    project: oid('project'),
    used: true,
  },
  {
    key: 'J4',
    tag: 'js',
    project: oid('project'),
    used: true,
  },
  {
    key: 'N1',
    tag: 'node',
    project: oid('project'),
    used: true,
  },
  {
    key: 'N2',
    tag: 'node',
    project: oid('project'),
    used: true,
  },
  {
    key: 'N3',
    tag: 'node',
    project: oid('project'),
    used: true,
  },
  {
    key: 'N4',
    tag: 'node',
    project: oid('project'),
    used: true,
  }

];
