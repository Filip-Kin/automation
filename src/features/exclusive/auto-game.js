const juration = require('juration');
const fs = require('fs-extra');

const leaderboard = (() => {
  try {
    return require('../../../data/leaderboard.json');
  } catch (error) {
    return { };
  }
})();

FeatureAllowed((guild) => {
  return guild.id === '775338764159287313';
});

async function updateLeaderboard(guild) {
  const ch = guild.channels.cache.find(x => x.id === '775348904773812254')
  let msg = ch.lastMessage ? ch.lastMessage : (await ch.messages.fetch({ limit: 1 })).array()[0];
  if (!msg || msg.author.id !== '526139924517486602') {
    msg = await ch.send('[leaderboard]');
  }
  const fullLeaderboard = [
    ...Object.keys(leaderboard).map(x => ({ id: x, ...leaderboard[x], joined: false })),
    ...guild.members.cache.array()
      .filter(member => !member.roles.cache.find(x => x.name.includes("Admin")))
      .map(member => {
        return {
          id: member.id,
          name: member.user.username,
          member,
          joined: true,
          duration: Date.now() - member.joinedTimestamp
        }
      })
  ]
  msg.edit([
    '**Leaderboard** (Updates every 15 minutes)',
    ...fullLeaderboard
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 5)
      .map((key, i) => {
        return `**${i + 1}.** ${key.member || key.name} - ${juration.humanize(Math.floor(key.duration / 1000))}`;
      })
  ])
}

OnDiscordEvent('guildMemberRemove', async({ guild }, member) => {
  const duration = Date.now() - member.joinedTimestamp;
  console.log('j', member.user.tag, duration);
  
  const lbChannel = guild.channels.cache.find(x => x.name === 'leaderboard-log');
  console.log('j', lbChannel.id);

  if (member.roles.cache.find(x => x.name.includes('Admin'))) {
    lbChannel.send(`**${member.user.name}** was an admin and left. No score.`)
  } else {
    const time = juration.humanize(Math.floor(duration/1000));
    lbChannel.send(`**${member.user.username}** left. Time: **${time}**`);

    leaderboard[member.id] = {
      name: member.user.username,
      duration: duration,
    };
    await fs.writeJSON('data/leaderboard.json', leaderboard, { spaces: 2 });
    updateLeaderboard(guild)
  }
});

CommandHandler(/^score/, ({ msg }) => {
  if (msg.member.roles.cache.find(x => x.name.includes('Admin'))) {
    msg.channel.send(`You are not eligible for the game.`)
  } else {
    const duration = Date.now() - msg.member.joinedTimestamp;
    const time = juration.humanize(Math.floor(duration/1000));
    msg.channel.send(`Your current time is **${time}**.`);
  }
})

CommandHandler(/^updateLeaderboard/, RequiresAdmin, ({ msg }) => {
  updateLeaderboard(msg.guild);
})
OnInterval((guild) => {
  updateLeaderboard(guild);
}, 15 * 60 * 1000)