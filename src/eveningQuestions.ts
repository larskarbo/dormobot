import { Questions } from "./index"
import { timeValidate } from "./utils"

const questions: Questions = [
  {
    text: "Did you drink coffeine today? ☕️",
    key: "coffee",
    alternatives: [
      {
        text: "No",
        value: false
      },
      {
        text: "Yes",
        value: true
      }
    ]
  }, {
    text: "How did you function today? 🥁",
    key: "daytime_function",
    alternatives: ["1 Bad", 2, 3, 4, "5 Very good"].map((text, i) => ({
      text: text + "",
      value: i + 1
    }))
  }, {
    text: "When are you going to bed? (write or press)",
    key: "bedtime",
    validateFn: timeValidate,
    alternatives: [
      {
        text: "02:00",
        value: "02:00"
      },
      {
        text: "01:00",
        value: "01:00"
      },
    ]
  }
];

export default questions
