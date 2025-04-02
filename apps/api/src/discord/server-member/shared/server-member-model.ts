import { model, Schema } from 'mongoose';

import { type DiscordServerMember } from '@some-tools/shared/api/types';

const defaultRequired: [boolean, string] = [true, 'is required'];
const minlength = (len: number): [number, string] => [len, 'minimum length is {MINLENGTH}'];

const ServerMemberSchema = new Schema<DiscordServerMember>(
  {
    discordId: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },

    firstName: {
      type: String,
      required: defaultRequired,
      trim: true,
      minlength: minlength(1),
    },

    lastName: {
      type: String,
      required: defaultRequired,
      trim: true,
      minlength: minlength(1),
    },

    email: {
      type: String,
      required: defaultRequired,
      minlength: minlength(3),
      /**
       * Favoring a very minimal email regex since emails are coming from an export from the CRM that has already validated
       * them.
       */
      match: [/^(.+)@(.+)$/, 'Invalid email format'],
      /** Emails in queries must be lowercased since emails in DB will be. */
      lowercase: true,
      trim: true,
      unique: true,
    },

    roles: [String],
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

ServerMemberSchema.pre('save', function (next) {
  // Ensure no duplicates. When a Discord GuildMember has roles set and there is a duplicate, it causes an error.
  this.roles = Array.from(new Set(this.roles));
  next();
});

const ServerMember = model<DiscordServerMember>('ServerMember', ServerMemberSchema);

export { ServerMember };
