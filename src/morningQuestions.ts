import { Questions } from './index';
import { timeValidate } from './utils';

const questions: Questions = [
  {
    text: 'How long time did you spend to fall asleep?',
    key: 'sleep_onset_delay',
    validateFn: input => {
      return input;
    },
    alternatives: [
      {
        text: '20 min',
        value: 20,
      },
      {
        text: '30 min',
        value: 30,
      },
    ],
  },
  {
    text: 'When did you wake up?',
    key: 'wake_up',
    validateFn: timeValidate,
    alternatives: [
      {
        text: '07:30',
        value: '07:30',
      },
      {
        text: '08:00',
        value: '08:00',
      },
    ],
  },
  {
    text: 'When did you go out of bed?',
    key: 'out_of_bed',
    validateFn: timeValidate,
    alternatives: [
      {
        text: '08:00',
        value: '08:00',
      },
      {
        text: '08:05',
        value: '08:05',
      },
    ],
  },
  {
    text: 'How did you feel?',
    key: 'morning_feeling',
    alternatives: ['🥱', 2, 3, 4, '🥳'].map((text, i) => ({
      text: text + '',
      value: i + 1,
    })),
  },
];

export default questions;
