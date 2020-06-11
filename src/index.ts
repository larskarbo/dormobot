import { Telegraf, Markup, Extra, Scene, Context as TelegrafContext } from "telegraf";
import { v4 as uuidv4 } from 'uuid';
import eveningQuestions from "./eveningQuestions"
import morningQuestions from "./morningQuestions"
const LocalSession = require("telegraf-session-local");

interface Quiz {
  type: EntryType,
  questionIndex: number,
  answers: {
    [property: string]: any
  },
  questions: {
    [index: number]: Question
  }
}

interface Context extends TelegrafContext {
  session: {
    quiz: Quiz
  }
}


const bot = new Telegraf(process.env.DORMOBOT_API_TOKEN as string);

bot.use(
  new LocalSession({
    database: "db.json",
    storage: LocalSession.storageFileSync
  }).middleware()
);

bot.command("start", async ctx => {
  // ctx.session.done = 0; // restart done counter
  await ctx.reply("Welcome to the Dormo Bot! ⭐️");
  await ctx.reply("/evening /morning");
});

type EntryType = "evening" | "morning"
interface Entry {
  date: Date,
  type: EntryType,
  answers: {
    [propName: string]: any;
  }
}

interface Alternative {
  text: string,
  value: any
}

interface Question {
  text: string,
  key: string,
  validateFn?: (x: string) => false | any,
  alternatives: Alternative[]
}

export interface Questions{
  [index: number]: Question;
}



bot.command("evening", async (ctx) => {
  const quiz : Quiz = {
    type: "evening",
    questionIndex: -1,
    questions: eveningQuestions,
    answers: {
      ...ctx.session.quiz.answers
    }
  }
  ctx.session.quiz = quiz

  nextQuestion(ctx);
});

bot.command("morning", async (ctx) => {
  const quiz : Quiz = {
    type: "morning",
    questionIndex: -1,
    questions: morningQuestions,
    answers: {
      ...ctx.session.quiz.answers
    }
  }
  ctx.session.quiz = quiz

  nextQuestion(ctx);
});

const keyboard = (alternatives, value: any) => {
  return Markup.inlineKeyboard(
    alternatives.map(alt =>
      Markup.callbackButton(
        value === alt.value ? `→ ${alt.text} ←` : alt.text,
        alt.id
      )
    )
  );
};

const finish = (ctx:Context) => {
  ctx.reply("Finish!", Markup.inlineKeyboard([
    Markup.callbackButton(
      "Save",
      "save"
    )
  ]).extra())
}

bot.action("save", ctx => {
  const entry : Entry = {
    date: new Date(),
    type: ctx.session.quiz.type,
    answers: ctx.session.quiz.answers
  }
  ctx.session.entries.push(entry)
  ctx.editMessageReplyMarkup(Markup.inlineKeyboard([
  ]))
  ctx.reply(`Added your ${ctx.session.quiz.type} entry ✅`)
})

const nextQuestion = (ctx: Context) => {
  const questions = ctx.session.quiz.questions
  ctx.session.quiz.questionIndex += 1;
  const thisIndex = ctx.session.quiz.questionIndex
  if (thisIndex >= questions.length) {
    return finish(ctx)
  }
  const q = questions[ctx.session.quiz.questionIndex];

  const alts = q.alternatives.map(a => ({
    ...a,
    id: uuidv4()
  }))

  alts.forEach(a => {
    bot.action(a.id, async ctx => {
      await ctx.answerCbQuery();
      ctx.session.quiz.answers[q.key] = a.value
      ctx.editMessageReplyMarkup(keyboard(alts, ctx.session.quiz.answers[q.key])).catch(() => { });
      if (thisIndex == ctx.session.quiz.questionIndex) {
        nextQuestion(ctx)
      }
    });
  })

  ctx.reply(q.text, keyboard(alts, ctx.session.quiz.answers[q.key]).extra());
};

bot.on('text', (ctx) => {
  const questions = ctx.session.quiz.questions
  const q = questions[ctx.session.quiz.questionIndex];
  if(q.validateFn){
    if(q.validateFn(ctx.message.text)){
      ctx.session.quiz.answers[q.key] = ctx.message.text
      return nextQuestion(ctx)
    } else {
      return ctx.reply("We couldn't understand that answer...!")
    }
  }
  return ctx.reply(`horse`)
})


bot.launch();