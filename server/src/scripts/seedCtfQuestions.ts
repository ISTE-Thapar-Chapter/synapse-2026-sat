import mongoose from 'mongoose';
import { CompetitionConfig } from '../models/CompetitionConfig.js';
import { DEFAULT_QUIZ_QUESTIONS } from '../data/defaultQuizQuestions.js';

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/synapse_2026');
  console.log('Connected to MongoDB');

  const config = await CompetitionConfig.findOne();
  if (config) {
    config.quizQuestions = DEFAULT_QUIZ_QUESTIONS as any;
    config.quizMultiplier = 100000;
    await config.save();
    console.log(`Updated CompetitionConfig with ${config.quizQuestions.length} CTF questions!`);
  } else {
    await CompetitionConfig.create({
      quizQuestions: DEFAULT_QUIZ_QUESTIONS,
      quizMultiplier: 100000,
      quizStatus: 'not_started',
    });
    console.log('Created fresh CompetitionConfig with 20 CTF questions!');
  }
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
