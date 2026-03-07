import type { UserConfig } from '@commitlint/types';

const Configuration: UserConfig = {
  extends: ['@commitlint/config-conventional'],
  formatter: '@commitlint/format',

  rules: {
    'subject-empty': [0],
  },
  helpUrl: `
  Example of a commit message:
    feat: added new button component
  The commit message consists of a type (feat, fix, docs, etc.) followed by a colon and a brief description of the change.
  `
};

export default Configuration;
