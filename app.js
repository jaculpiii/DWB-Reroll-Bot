// Created for DWB RPG
// (c) James "Chuz" Culp 2022

import {
  EmbedBuilder,
} from "discord.js";
import util from "node:util";
import express from "express";
import {
  InteractionType,
  InteractionResponseType,
  InteractionResponseFlags,
  MessageComponentTypes,
  ButtonStyleTypes,
} from "discord-interactions";
import {
  VerifyDiscordRequest,
  getRandomEmoji,
  DiscordRequest,
} from "./utils.js";
import {
  BAL_COMMAND,
  RR_COMMAND,
  ADD_COMMAND,
  RESET_COMMAND,
  REROLL_COMMAND,
  REPORT_COMMAND,
  HELP_COMMAND,
  HasGuildCommands,
} from "./commands.js";
import { sequelize } from "./db.js";
import { User } from "./models/user.js";

// Create an express app
const app = express();
// Get port, or default to 3000
const PORT = process.env.PORT || 3000;
// Parse request body and verifies incoming requests using discord-interactions package
app.use(express.json({ verify: VerifyDiscordRequest(process.env.PUBLIC_KEY) }));


/**
  List of authorized Discord IDs for restricted commands
**/
const authed_ids = {
  DWB: '182658928323198976',
  Chuz: '182244097841561600'
};

/**
 * Interactions endpoint URL where Discord will send HTTP requests
 */
app.post("/interactions", async function (req, res) {
  // Reinitialize SQLite stuff?
  // Leaving this active when the bot is live can really blow things up
  //await sequelize.sync( { alter: true });

  // Interaction type and data
  const { type, id, data } = req.body;

  /**
   * Handle verification requests
   */
  if (type === InteractionType.PING) {
    return res.send({ type: InteractionResponseType.PONG });
  }

  /**
   * Handle slash command requests
   * See https://discord.com/developers/docs/interactions/application-commands#slash-commands
   */
  if (type === InteractionType.APPLICATION_COMMAND) {
    const { name } = data;



    // "reroll" or "rr" guild commands
    if (name === "reroll" || name === "rr") {
      const userId = req.body.member.user.id;
      let user = await User.findOne({ where: { id: req.body.member.user.id } });

      if (!user || user.currency <= 0) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: "You do not have any reroll tokens to use.  Head to <#733841683762118688> to buy more!",
          },
        });
      } else {
        let current = user.currency - 1;
        await User.update(
          {
            currency: current,
          },
          {
            where: {
              id: req.body.member.user.id,
            },
          }
        );

        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content:
              "1 reroll token used.  You currently have " + current + " reroll tokens remaining of " + user.total + " purchased.",
          },
        });
      }
    }



    // "add" guild command
    if (name === "add") {
      const userId = req.body.member.user.id;

      if (
        typeof req.body.data.resolved.users === "undefined" ||
        !req.body.data.resolved.users[req.body.data.options[1].value]
      ) {
        // The 2nd parameter was not a user (probably a role)
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content:
              "Adding reroll tokens to roles is currently not enabled.  Please select an individual user.",
          },
        });
      }

      let user = await User.findOne({
        where: { id: req.body.data.options[1].value },
      });
      let current = 0;
      let total = 0;

      if (!user) {
        current = req.body.data.options[0].value;
        total = req.body.data.options[0].value;
        user = User.build({
          id: req.body.data.options[1].value,
          currency: current,
          total: total,
        });
        await user.save();
      } else {
        current = user.currency + req.body.data.options[0].value;
        total = user.total + req.body.data.options[0].value;

        await User.update(
          {
            currency: current,
            total: total,
          },
          {
            where: {
              id: req.body.data.options[1].value,
            },
          }
        );
      }

      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: req.body.data.options[0].value + " Reroll token(s) added. " + req.body.data.resolved.users[req.body.data.options[1].value] .username + " now has " + current + " reroll tokens remaining of " + total + " reroll tokens purchased.",
        },
      });
    }



    // "bal" guild command
    if (name === "bal") {
      const userId = req.body.member.user.id;
      let user = await User.findOne({ where: { id: req.body.member.user.id } });

      if (!user) {
        user = User.build({
          id: req.body.member.user.id,
          currency: 0,
          total: 0,
        });
      }

      let upsell = '';
      if(user.currency <= 0) {
        upsell = "  Head to <#733841683762118688> for the link to buy more!";
      }
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content:
            "You currently have " + user.currency + " reroll tokens remaining of " + user.total + " reroll tokens purchased." + upsell,
        },
      });
    }



    // "reset" guild command
    if (name === "reset") {
      // If they selected "Yes" and they are defined in authed_ids above
      if( req.body.data.options[0].value && Object.values(authed_ids).includes(req.body.member.user.id)) {
        await User.destroy({ truncate: true });
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            // Fetches a random emoji to send from a helper function
            content: "The reroll tokens have been reset successfully!",
          },
        });
      } else {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: "You are not authorized to use this command! Only DWB can reset the database.",
          },
        });
      }
    }



    // "report" guild command
    if (name === "report") {
      // Only allow users defined in authed_ids above to use this command
      if(! Object.values(authed_ids).includes(req.body.member.user.id)) {
        await User.destroy({ truncate: true });
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: "You are not authorized to use this command! Only DWB can run the report.",
          },
        });
      }

      let users = [];
      if( req.body.data.options && req.body.data.options[0].value ) {
        users.push(await User.findOne({ where: { id: req.body.data.options[0].value } }));
      } else {
        users = await User.findAll({ raw: true });
      }

      let content = "**Reroll Token Report\nMember\n\t\tRemaining\t\tPurchased**\n";
      users.forEach((user) => {
        let uname = util.format("<@%s>", user.id);
        let currency = util.format("%i", user.currency);
        currency = currency.padEnd(3, ' ');

        content += util.format("%s\n\t\t\t\t%s\t\t\t\t\t\t%s\n", uname, currency, user.total);
      })


      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: content,
        }
      })
    }



    // "help" guild command
    if( name === "help") {
      const exampleEmbed = {
        color: 0x23dd17,
        title: 'So you need help traveler?',
        url: '',
        description: 'Glad you came to the right place, let me guide you!',
        thumbnail: {
          url: 'https://static.wikia.nocookie.net/criticalrole/images/1/10/BlackSalander_-_The_Traveler.jpg/revision/latest?cb=20180824205702',
        },
        fields: [
          {name: 'Reroll', value: 'Syntax: `/reroll` or `/rr` This command is used to use one reroll token.'},
          {name: 'Add', value: 'Syntax: `/add [number] @user` This command is for admins and staff to add rerolls to your account'},
          {name: 'Bal', value: 'Syntax: `/bal` This command will show you how many rerolls you currently have.'},
          {name: 'Reset', value: 'Syntax: `/reset` This command is to delete all tokens and is only useable by DWB.'},
          {name: 'Report', value: 'Syntax: `/report @user` or `/report` This command will report how many rerolls remain for `@user` or for all users if `@user` is not included.'},
        ],
        timestamp: new Date().toISOString(),
        author: {
          name: 'Chuz',
          icon_url: 'https://s3.amazonaws.com/files.d20.io/images/299505565/Fl5zSwPGXKtS1WvwG6uH8A/med.png?1660443352581&size=200x200',
          url: 'https://github.com/jaculpiii',
        },
        footer: {
          text: '',
          icon_url: '',
        },
      };

      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          embeds: [exampleEmbed],
        }
      })



    }
  }
});


app.listen(PORT, () => {
  console.log("Listening on port", PORT);

  // Check if guild commands from commands.json are installed (if not, install them)
  HasGuildCommands(process.env.APP_ID, process.env.GUILD_ID, [
    BAL_COMMAND,
    RR_COMMAND,
    ADD_COMMAND,
    RESET_COMMAND,
    REROLL_COMMAND,
    REPORT_COMMAND,
    HELP_COMMAND,
  ]);
});


