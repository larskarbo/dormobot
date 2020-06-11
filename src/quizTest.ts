var Telegraf = require('telegraf')
var Quizes = require('telegraf-quiz')
var Quize = require('telegraf-quiz').Quiz

// More info: https://github.com/telegraf/kwiz
var sampleQuizDefinition = {
  questions: [
    { message: 'Hey' },
    { message: 'What is your name?', answer: {type: 'string', hint: 'Really?', id: 'name'} },
    { message: 'Bye {{answers.name}}' }
  ]
}

const telegraf = new Telegraf(process.env.DORMOBOT_API_TOKEN as string)
const quizes = new Quizes()

// Specify cancel quiz commands, default value: [`/cancel`]
quizes.cancelCommands = ['/cancel', '/stop', 'please stop', 'sudo stop']

// For testing only. Session will be lost on app restart
// telegraf.use(Telegraf.memorySession())

// Add middleware
telegraf.use(quizes.middleware())

const beveragePoll = new Quiz('beveragePoll', sampleQuizDefinition)

beveragePoll.onCompleted((ctx) => {
  const results = JSON.stringify(ctx.state.quiz, null, 2)
  const status = ctx.state.quiz.canceled ? 'canceled' : 'completed'
  return ctx.reply(`Quiz ${status} ${results}`)
})

// Register quiz
quizes.register(beveragePoll)

// start quiz on command
telegraf.command('/start', (ctx) => {
  return ctx.quiz.start('beveragePoll')
})

telegraf.startPolling()
