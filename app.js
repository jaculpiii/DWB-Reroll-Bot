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
  ADD_COMMAND,
  RESET_COMMAND,
  RR_COMMAND,
  REROLL_COMMAND,
  BAL_COMMAND,
  HasGuildCommands,
} from "./commands.js";
import {
  sequelize,
} from "./db.js";
import {
  User,
} from "./models/user.js";



// Create an express app
const app = express();
// Get port, or default to 3000
const PORT = process.env.PORT || 3000;
// Parse request body and verifies incoming requests using discord-interactions package
app.use(express.json({ verify: VerifyDiscordRequest(process.env.PUBLIC_KEY) }));

/**
 * Interactions endpoint URL where Discord will send HTTP requests
 */
app.post("/interactions", async function (req, res) {
  // SQLite stuff?
//  await sequelize.sync( { alter: true });

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
      let user = await User.findOne({ where: {id: req.body.member.user.id} });
      
      if(! user || user.currency <= 0) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: "You do not have any rerolls to use.",
          },
        });
      } else {
        let total = user.currency - 1;
        await User.update(
          {
            currency: total
          }, {
            where: {
              id: req.body.member.user.id,
            }
          }
        );

        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: "1 Reroll used.  You currently have " + total + " rerolls remaining.",
          },
        });
      }
    }
    
    // "add" guild command
    if (name === "add" || name === "addrr") {
      const userId = req.body.member.user.id;

      if(typeof req.body.data.resolved.users === 'undefined' || ! req.body.data.resolved.users[req.body.data.options[1].value]) {
        // The 2nd parameter was not a user (probably a role)
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: "Adding rerolls to roles is currently not enabled.  Please select an individual user.",
          },
        });
      }
      
      let user = await User.findOne({ where: {id: req.body.data.options[1].value} });
      let total = 0;

      if(! user) {
        total = req.body.data.options[0].value;
        user = User.build({
          id: req.body.member.user.id,
          currency: total,
        });
        await user.save();
      } else {
        total = user.currency + req.body.data.options[0].value;
        await User.update(
          {
            currency: total
          }, {
            where: {
              id: req.body.data.options[1].value,
            }
          }
        );
      }

      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: req.body.data.options[0].value + " Rerolls added. " + req.body.data.resolved.users[req.body.data.options[1].value].username + " now has " + total + " rerolls remaining.",
        },
      });
      
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          // Fetches a random emoji to send from a helper function
          content: "Not implemented yet." + getRandomEmoji(),
        },
      });
    }

    // "bal" guild command
    if (name === "bal") {
      const userId = req.body.member.user.id;
      let user = await User.findOne({ where: {id: req.body.member.user.id} });
      
      if(! user) {
        user = User.build({
          id: req.body.member.user.id,
          currency: 0,
        });
      }

      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: "You currently have " + user.currency + " rerolls remaining.",
        },
      });
    }
    
    // "reset" guild command
    if(name === "reset") {
      // If they selected "Yes" and they are Chuz ('1033603369887092786') then we wipe the db
      if(req.body.data.options[0].value && req.body.data.id === '1033603369887092786') {
        await User.destroy({ truncate: true });
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            // Fetches a random emoji to send from a helper function
            content: "Reroll database reset.",
          },
        });
      } else {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            // Fetches a random emoji to send from a helper function
            content: "Unauthorized, sorry." + getRandomEmoji(),
          },
        });
      }
    }
  }
});


app.listen(PORT, () => {
  console.log("Listening on port", PORT);

  // Check if guild commands from commands.json are installed (if not, install them)
  HasGuildCommands(process.env.APP_ID, process.env.GUILD_ID, [
    ADD_COMMAND,
    RESET_COMMAND,
    RR_COMMAND,
    REROLL_COMMAND,
    BAL_COMMAND,
  ]);
});
