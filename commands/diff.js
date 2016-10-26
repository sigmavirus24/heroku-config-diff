'use strict'

const cli = require('heroku-cli-util')
const _ = require('lodash')

function elide (value, maxLen = 50) {
  if (value && value.length > maxLen) {
    return value.substr(0, maxLen - 1) + '…'
  } else {
    return value
  }
}

function diff (context, heroku) {
  const ourApp = context.app
  const otherApp = context.args.OTHER_APP

  const displayVar = (key, config) => {
    if (context.flags.verbose) {
      console.log(`${key}=${config[key]}`)
    } else {
      console.log(key)
    }
  }

  return Promise.all([ heroku.apps(ourApp).configVars().info(),
                heroku.apps(otherApp).configVars().info() ])
    .then((result) => {
      const [ ourConfig, otherConfig ] = result
      const ourKeys = Object.keys(ourConfig)
      const otherKeys = Object.keys(otherConfig)

      const onlyOurs = _.difference(ourKeys, otherKeys)
      const onlyOther = _.difference(otherKeys, ourKeys)
      const common = _.intersection(ourKeys, otherKeys)

      const same = common.filter((key) => {
        return ourConfig[key] === otherConfig[key]
      })
      const different = _.difference(common, same)

      if (context.flags.verbose) {
        const allKeys = _.uniq(ourKeys.concat(otherKeys)).sort()
        cli.table(allKeys.map((k) => {
          let ours = elide(ourConfig[k])
          let other = elide(otherConfig[k])

          if (ours && !other) {
            other = cli.color.red('--')
          } else if (!ours && other) {
            ours = cli.color.red('--')
          } else if (ours !== other) {
            ours = cli.color.red(ours)
            other = cli.color.green(other)
          }

          return {key: k, ours: ours, other: other}
        }), {
          columns: [
            {key: 'key', label: 'Config Var'},
            {key: 'ours', label: `In ${ourApp}`},
            {key: 'other', label: `In ${otherApp}`},
          ]
        })
      } else {
        if (onlyOurs.length > 0) {
          cli.styledHeader('Only in ' + ourApp)
          onlyOurs.forEach(k => displayVar(k, ourConfig))
        }

        if (onlyOther.length > 0) {
          cli.styledHeader('Only in ' + otherApp)
          onlyOther.forEach(k => displayVar(k, otherConfig))
        }

        if (same.length > 0) {
          cli.styledHeader('Same value')
          same.forEach(k => displayVar(k, ourConfig))
        }

        if (different.length > 0) {
          cli.styledHeader('Different values')
          different.forEach((k) => displayVar(k, ourConfig))
        }
      }
    })
}

module.exports = {
  topic: 'config',
  command: 'diff',
  description: 'compare environments across two apps',
  args: [
    { name: 'OTHER_APP', optional: false },
  ],
  flags: [
    { name: 'verbose', char: 'v',
      description: 'include config var values in diff',
      hasValue: false, optional: true },
  ],
  help: `
config:diff app

Compare differences in environment between current app
  and another app specified as the argument. With the
  'verbose' flag, also prints the config var values.

Example:

$ heroku config:diff sushi --app sushi-staging
=== Only in sushi-staging
HEROKU_POSTGRESQL_GREEN_URL
DEBUG
=== Only in sushi
HEROKU_POSTGRESQL_RED_URL
=== Same value
GOMAXPROCS
=== Different values
DATABASE_URL
  `,

  needsAuth: true,
  needsApp: true,

  run: cli.command(diff)
}
