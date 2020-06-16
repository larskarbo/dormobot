import Telegraf, { Markup, Context } from "telegraf";
import { v4 as uuidv4 } from "uuid";
import eveningQuestions from "./eveningQuestions";
import morningQuestions from "./morningQuestions";
import * as moment from 'moment'
const LocalSession = require("telegraf-session-local");

const low = require("lowdb");
const FileAsync = require("lowdb/adapters/FileAsync");

const adapter = new FileAsync("db.json");

let db: any;
const initAdapter = async () => {
  db = await low(adapter);
  await db.defaults({ entries: [] }).write();
};
initAdapter();

interface Quiz {
  type: EntryType;
  questionIndex: number;
  answers: {
    [property: string]: any;
  };
  questions: Array<Question>;
}

interface Session {
  quiz: Quiz | null;
  date: string
}

declare module "telegraf" {
  interface Context {
    session: Session;
  }
}

const bot = new Telegraf(process.env.DORMOBOT_API_TOKEN as string);

bot.use(
  new LocalSession({
    database: "state.json",
    storage: LocalSession.storageMemory
  }).middleware()
);

bot.command("start", async ctx => {
  // ctx.session.done = 0; // restart done counter
  // ctx.session.quiz = null;
  await ctx.reply("Welcome to the Dormo Bot! ⭐️");
  await ctx.reply("/evening /morning");
});

type EntryType = "evening" | "morning";

interface Entry {
  date: string;
  user?: string;
  answers: {
    [propName: string]: any;
  };
}

interface Alternative {
  text: string;
  value: any;
  id?: string
}

interface Question {
  text: string;
  key: string;
  validateFn?: (x: string) => false | any;
  alternatives: Alternative[];
}

export interface Questions extends Array<Question> {
}


bot.command("evening", async ctx => {
  let dateMoment = moment()
  if (dateMoment.hours() < 12) {
    // after midnight but still count it as last day
    dateMoment = dateMoment.subtract(1, "day")
  }
  const date = dateMoment.format("LL")


  const alreadyEntry = await getAlreadyEntry(date, ctx.from?.username)
  const quiz: Quiz = {
    type: "evening",
    questionIndex: -1,
    questions: eveningQuestions,
    answers: { ...alreadyEntry.answers }
  };
  ctx.session.quiz = quiz;
  ctx.session.date = date;


  nextQuestion(ctx);
});

const getAlreadyEntry = async (date: string, user?: string) => {
  const alreadyEntry = await db
    .get("entries")
    .find({
      user: user,
      date: date
    })
    .value()
  if(alreadyEntry){
    return alreadyEntry
  }
  return {
    answers: []
  }
}

bot.command("morning", async ctx => {
  const date =  moment().subtract(1, "day").format("LL")
  const alreadyEntry = await getAlreadyEntry(date, ctx.from?.username)

  const quiz: Quiz = {
    type: "morning",
    questionIndex: -1,
    questions: morningQuestions,
    answers: { ...alreadyEntry.answers }
  };
  ctx.session.quiz = quiz;
  ctx.session.date = date

  nextQuestion(ctx);
});


bot.command("export", async ctx => {
  const yo = await db
    .get("entries")
    .filter({
      user: ctx.from?.username
    })
    .value()

  console.log(yo)

  await ctx.reply("```\n" + JSON.stringify(yo) + "\n```")
});

const keyboard = (alternatives: Alternative[], value: any) => {
  return Markup.inlineKeyboard(
    alternatives.map(alt => {
      if (!alt.id) {
        throw new Error("please add id!")
      }
      return Markup.callbackButton(
        value === alt.value ? `→ ${alt.text} ←` : alt.text,
        alt.id
      )
    }
    )
  );
};

const finish = (ctx: Context) => {
  ctx.reply(
    "Finish!",
    Markup.inlineKeyboard([Markup.callbackButton("Save", "save")]).extra()
  );
};

bot.action("save", async ctx => {
  if (!ctx.session.quiz) {
    return;
  }

  const entry: Entry = {
    date: ctx.session.date,
    // type: ctx.session.quiz.type,
    answers: ctx.session.quiz.answers,
    user: ctx.from?.username
  };

  ctx.editMessageReplyMarkup(Markup.inlineKeyboard([]));

  const yo = await db
    .get("entries")
    .filter({
      user: entry.user,
      date: entry.date
    })
    .value()

  console.log('yo: ', yo);
  if (yo.length) {
    console.log("update!")
    await db.get('entries')
      .find({
        user: entry.user,
        date: entry.date
      })
      .assign({
        answers: {
          ...yo[0].answers,
          ...entry.answers
        }
      })
      .write()
  } else {
    console.log("add!")
    await db
      .get("entries")
      .push(entry)
      .write();
  }



  ctx.reply(`Added your ${ctx.session.quiz.type} entry ✅\n\nQuick commands: \n→ /morning\n→ /evening\n→ /export`);
  ctx.session.quiz = null
});

const nextQuestion = (ctx: Context) => {
  if (!ctx.session.quiz) {
    return
  }
  const questions = ctx.session.quiz.questions;
  ctx.session.quiz.questionIndex += 1;
  const thisIndex = ctx.session.quiz.questionIndex;
  if (thisIndex >= questions.length) {
    return finish(ctx);
  }
  const q = questions[ctx.session.quiz.questionIndex];

  const alts = q.alternatives.map(a => ({
    ...a,
    id: uuidv4()
  }));

  alts.forEach(a => {
    bot.action(a.id, async ctx => {
      if (!ctx.session.quiz) {
        return
      }
      await ctx.answerCbQuery();
      ctx.session.quiz.answers[q.key] = a.value;
      ctx
        .editMessageReplyMarkup(keyboard(alts, ctx.session.quiz.answers[q.key]))
        .catch(() => { });
      if (thisIndex == ctx.session.quiz.questionIndex) {
        nextQuestion(ctx);
      }
    });
  });

  ctx.reply(q.text, keyboard(alts, ctx.session.quiz.answers[q.key]).extra());
};

bot.on("text", ctx => {
  if (ctx.session.quiz) {
    const questions = ctx.session.quiz.questions;
    const q = questions[ctx.session.quiz.questionIndex];
    if (q.validateFn && ctx.message && ctx.message.text) {
      if (q.validateFn(ctx.message.text)) {
        ctx.session.quiz.answers[q.key] = ctx.message.text;
        return nextQuestion(ctx);
      } else {
        return ctx.reply("We couldn't understand that answer...!");
      }
    }
    return ctx.reply(`horse`);
  } else {
    return ctx.reply(`whats up homie`);
  }
});

bot.launch();
