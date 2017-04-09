let crypto = require('crypto');
let config = require('config');
let execSync = require('child_process').execSync;
let log = require('log')();

exports.post = function*() {

  let signature = this.get('x-hub-signature');
  let event = this.get('x-github-event');
  let id = this.get('x-github-delivery');

  if (!signature) {
    this.throw(400, 'No X-Hub-Signature found on request');
  }

  if (!event) {
    this.throw(400, 'No X-Github-Event found on request');
  }

  if (!id) {
    this.throw(400, 'No X-Github-Delivery found on request');
  }

  this.log.debug("github hook", {requestVerbose: this.request});

  // koa-bodyparser gives that
  console.log(this.request.rawBody);

  signature = signature.replace(/^sha1=/, '');
  let computedSignature = crypto.createHmac('sha1', Buffer.from(config.githubTutorialHook.secret, 'utf-8')).update(this.request.rawBody).digest('hex');

  this.log.debug("Compare signature", computedSignature, signature);
  if (computedSignature !== signature) {
    this.throw(400, 'X-Hub-Signature does not match blob signature');
  }

  this.log.debug("Hook data", this.request.body);

  let branch = this.request.body.ref.split('/').pop();

  if (branch == 'en' || branch == 'ru') {
    this.log.debug("reimport tutorial");
    yield* importTutorial(branch);
  }

  this.body = {ok: true};
};

exports.get = function*() {
  yield* importTutorial('en');
  this.body = 'ok';
};

function* importTutorial(branch) {
  let env = {
    NODE_ENV: 'production',
    NODE_LANG: branch
  };

  exec(`git pull origin ${branch}`, {cwd: '/js/javascript-tutorial'});
  exec(`git checkout ${branch}`, {cwd: '/js/javascript-tutorial'});

  let cmd = `npm --silent run gulp -- tutorial:remoteUpdate --host learn-${branch} --root /js/javascript-tutorial`;
  exec(cmd, { env });
}


function exec(...args) {
  log.info(...args);
  try {
    return execSync(...args);
  } catch(err) {
    log.error(err);
    throw err;
  }
}


/*
 { ref: 'refs/heads/master',
 before: 'ffbddf6fed17c9c4bfbfc92e410ffe9838130231',
 after: 'c7dc6f240ec614d9b255d57670caf16ce45f4e01',
 created: false,
 deleted: false,
 forced: false,
 base_ref: null,
 compare: 'https://github.com/iliakan/javascript-tutorial/compare/ffbddf6fed17...c7dc6f240ec6',
 commits:
 [ { id: 'c7dc6f240ec614d9b255d57670caf16ce45f4e01',
 tree_id: '72bc5df8fe259c2db97cfecdb3d3bd74a9ff4f50',
 distinct: true,
 message: 'Update README.md',
 timestamp: '2017-04-09T23:02:15+02:00',
 url: 'https://github.com/iliakan/javascript-tutorial/commit/c7dc6f240ec614d9b255d57670caf16ce45f4e01',
 author:
 { name: 'Ilya Kantor',
 email: 'iliakan@users.noreply.github.com',
 username: 'iliakan' },
 committer:
 { name: 'GitHub',
 email: 'noreply@github.com',
 username: 'web-flow' },
 added: [],
 removed: [],
 modified: [ 'README.md' ] } ],
 head_commit:
 { id: 'c7dc6f240ec614d9b255d57670caf16ce45f4e01',
 tree_id: '72bc5df8fe259c2db97cfecdb3d3bd74a9ff4f50',
 distinct: true,
 message: 'Update README.md',
 timestamp: '2017-04-09T23:02:15+02:00',
 url: 'https://github.com/iliakan/javascript-tutorial/commit/c7dc6f240ec614d9b255d57670caf16ce45f4e01',
 author:
 { name: 'Ilya Kantor',
 email: 'iliakan@users.noreply.github.com',
 username: 'iliakan' },
 committer:
 { name: 'GitHub',
 email: 'noreply@github.com',
 username: 'web-flow' },
 added: [],
 removed: [],
 modified: [ 'README.md' ] },
 repository:
 { id: 25786960,
 name: 'javascript-tutorial',
 full_name: 'iliakan/javascript-tutorial',
 owner:
 { name: 'iliakan',
 email: 'iliakan@users.noreply.github.com',
 login: 'iliakan',
 id: 349336,
 avatar_url: 'https://avatars3.githubusercontent.com/u/349336?v=3',
 gravatar_id: '',
 url: 'https://api.github.com/users/iliakan',
 html_url: 'https://github.com/iliakan',
 followers_url: 'https://api.github.com/users/iliakan/followers',
 following_url: 'https://api.github.com/users/iliakan/following{/other_user}',
 gists_url: 'https://api.github.com/users/iliakan/gists{/gist_id}',
 starred_url: 'https://api.github.com/users/iliakan/starred{/owner}{/repo}',
 subscriptions_url: 'https://api.github.com/users/iliakan/subscriptions',
 organizations_url: 'https://api.github.com/users/iliakan/orgs',
 repos_url: 'https://api.github.com/users/iliakan/repos',
 events_url: 'https://api.github.com/users/iliakan/events{/privacy}',
 received_events_url: 'https://api.github.com/users/iliakan/received_events',
 type: 'User',
 site_admin: false },
 private: false,
 html_url: 'https://github.com/iliakan/javascript-tutorial',
 description: 'The Modern JavaScript Tutorial',
 fork: false,
 url: 'https://github.com/iliakan/javascript-tutorial',
 forks_url: 'https://api.github.com/repos/iliakan/javascript-tutorial/forks',
 keys_url: 'https://api.github.com/repos/iliakan/javascript-tutorial/keys{/key_id}',
 collaborators_url: 'https://api.github.com/repos/iliakan/javascript-tutorial/collaborators{/collaborator}',
 teams_url: 'https://api.github.com/repos/iliakan/javascript-tutorial/teams',
 hooks_url: 'https://api.github.com/repos/iliakan/javascript-tutorial/hooks',
 issue_events_url: 'https://api.github.com/repos/iliakan/javascript-tutorial/issues/events{/number}',
 events_url: 'https://api.github.com/repos/iliakan/javascript-tutorial/events',
 assignees_url: 'https://api.github.com/repos/iliakan/javascript-tutorial/assignees{/user}',
 branches_url: 'https://api.github.com/repos/iliakan/javascript-tutorial/branches{/branch}',
 tags_url: 'https://api.github.com/repos/iliakan/javascript-tutorial/tags',
 blobs_url: 'https://api.github.com/repos/iliakan/javascript-tutorial/git/blobs{/sha}',
 git_tags_url: 'https://api.github.com/repos/iliakan/javascript-tutorial/git/tags{/sha}',
 git_refs_url: 'https://api.github.com/repos/iliakan/javascript-tutorial/git/refs{/sha}',
 trees_url: 'https://api.github.com/repos/iliakan/javascript-tutorial/git/trees{/sha}',
 statuses_url: 'https://api.github.com/repos/iliakan/javascript-tutorial/statuses/{sha}',
 languages_url: 'https://api.github.com/repos/iliakan/javascript-tutorial/languages',
 stargazers_url: 'https://api.github.com/repos/iliakan/javascript-tutorial/stargazers',
 contributors_url: 'https://api.github.com/repos/iliakan/javascript-tutorial/contributors',
 subscribers_url: 'https://api.github.com/repos/iliakan/javascript-tutorial/subscribers',
 subscription_url: 'https://api.github.com/repos/iliakan/javascript-tutorial/subscription',
 commits_url: 'https://api.github.com/repos/iliakan/javascript-tutorial/commits{/sha}',
 git_commits_url: 'https://api.github.com/repos/iliakan/javascript-tutorial/git/commits{/sha}',
 comments_url: 'https://api.github.com/repos/iliakan/javascript-tutorial/comments{/number}',
 issue_comment_url: 'https://api.github.com/repos/iliakan/javascript-tutorial/issues/comments{/number}',
 contents_url: 'https://api.github.com/repos/iliakan/javascript-tutorial/contents/{+path}',
 compare_url: 'https://api.github.com/repos/iliakan/javascript-tutorial/compare/{base}...{head}',
 merges_url: 'https://api.github.com/repos/iliakan/javascript-tutorial/merges',
 archive_url: 'https://api.github.com/repos/iliakan/javascript-tutorial/{archive_format}{/ref}',
 downloads_url: 'https://api.github.com/repos/iliakan/javascript-tutorial/downloads',
 issues_url: 'https://api.github.com/repos/iliakan/javascript-tutorial/issues{/number}',
 pulls_url: 'https://api.github.com/repos/iliakan/javascript-tutorial/pulls{/number}',
 milestones_url: 'https://api.github.com/repos/iliakan/javascript-tutorial/milestones{/number}',
 notifications_url: 'https://api.github.com/repos/iliakan/javascript-tutorial/notifications{?since,all,participating}',
 labels_url: 'https://api.github.com/repos/iliakan/javascript-tutorial/labels{/name}',
 releases_url: 'https://api.github.com/repos/iliakan/javascript-tutorial/releases{/id}',
 deployments_url: 'https://api.github.com/repos/iliakan/javascript-tutorial/deployments',
 created_at: 1414350571,
 updated_at: '2017-04-08T18:54:34Z',
 pushed_at: 1491771736,
 git_url: 'git://github.com/iliakan/javascript-tutorial.git',
 ssh_url: 'git@github.com:iliakan/javascript-tutorial.git',
 clone_url: 'https://github.com/iliakan/javascript-tutorial.git',
 svn_url: 'https://github.com/iliakan/javascript-tutorial',
 homepage: '',
 size: 444014,
 stargazers_count: 421,
 watchers_count: 421,
 language: null,
 has_issues: true,
 has_projects: true,
 has_downloads: true,
 has_wiki: true,
 has_pages: false,
 forks_count: 451,
 mirror_url: null,
 open_issues_count: 72,
 forks: 451,
 open_issues: 72,
 watchers: 421,
 default_branch: 'master',
 stargazers: 421,
 master_branch: 'master' },
 pusher: { name: 'iliakan', email: 'iliakan@users.noreply.github.com' },
 sender:
 { login: 'iliakan',
 id: 349336,
 avatar_url: 'https://avatars3.githubusercontent.com/u/349336?v=3',
 gravatar_id: '',
 url: 'https://api.github.com/users/iliakan',
 html_url: 'https://github.com/iliakan',
 followers_url: 'https://api.github.com/users/iliakan/followers',
 following_url: 'https://api.github.com/users/iliakan/following{/other_user}',
 gists_url: 'https://api.github.com/users/iliakan/gists{/gist_id}',
 starred_url: 'https://api.github.com/users/iliakan/starred{/owner}{/repo}',
 subscriptions_url: 'https://api.github.com/users/iliakan/subscriptions',
 organizations_url: 'https://api.github.com/users/iliakan/orgs',
 repos_url: 'https://api.github.com/users/iliakan/repos',
 events_url: 'https://api.github.com/users/iliakan/events{/privacy}',
 received_events_url: 'https://api.github.com/users/iliakan/received_events',
 type: 'User',
 site_admin: false } }
 */