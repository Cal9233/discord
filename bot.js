require("dotenv").config()


const Discord = require('discord.js');
const ytdl = require('ytdl-core');
const { YTSearcher } = require('ytsearcher');
const { executionAsyncResource } = require('async_hooks');
const client = new Discord.Client();

client.login(process.env.BOT_TOKEN)

const searcher = new YTSearcher({
  key: process.env.YT_API_KEY,
  revealed: true
})
const { Player } = require('discord-player');
const player = new Player(client);
client.player = player;

const queue = new Map();

//////Music Text////////

client.on('ready', () => {
  console.log('We are ready')
})

client.on("message", msg => {
  if (msg.content === "Venom, what are you?") {
    msg.channel.send("You see, I'm a loser. Like you")
  }
})

client.on("message", async(message) => {
  const prefix = '!';

  const serverQueue = queue.get(message.guild.id);

  const args = message.content.slice(prefix.length).trim().split(/ +/g)
  const command = args.shift().toLowerCase();

  switch(command){
      case 'play':
          execute(message, serverQueue);
          break;
      case 'stop':
          stop(message, serverQueue);
          break;
      case 'skip':
          skip(message, serverQueue);
          break;
      case 'pause':
          pause(serverQueue);
          break;
      case 'resume':
          resume(serverQueue);
          break;
  }

  async function execute(message, serverQueue){
      let vc = message.member.voice.channel;
      if(!vc){
          return message.channel.send("Go to voice chat first");
      }else{
          let result = await searcher.search(args.join(" "), { type: "video" })
          const songInfo = await ytdl.getInfo(result.first.url)

          let song = {
              title: songInfo.videoDetails.title,
              url: songInfo.videoDetails.video_url
          };

          if(!serverQueue){
              const queueConstructor = {
                  txtChannel: message.channel,
                  vChannel: vc,
                  connection: null,
                  songs: [],
                  volume: 10,
                  playing: true
              };
              queue.set(message.guild.id, queueConstructor);

              queueConstructor.songs.push(song);

              try{
                  let connection = await vc.join();
                  queueConstructor.connection = connection;
                  play(message.guild, queueConstructor.songs[0]);
              }catch (err){
                  console.error(err);
                  queue.delete(message.guild.id);
                  return message.channel.send(`Unable to join the voice chat ${err}`)
              }
          }else{
              serverQueue.songs.push(song);
              return message.channel.send(`The song has been added ${song.url}`);
          }
      }
  }
  function play(guild, song){
      const serverQueue = queue.get(guild.id);
      if(!song){
          serverQueue.vChannel.leave();
          queue.delete(guild.id);
          return;
      }
      const dispatcher = serverQueue.connection
          .play(ytdl(song.url))
          .on('finish', () =>{
              serverQueue.songs.shift();
              play(guild, serverQueue.songs[0]);
          })
          serverQueue.txtChannel.send(`Now playing ${serverQueue.songs[0].url}`)
  }
  function stop (message, serverQueue){
      if(!message.member.voice.channel)
          return message.channel.send("Gotta be on voice chat for that")
      serverQueue.songs = [];
      serverQueue.connection.dispatcher.end();
  }
  function skip (message, serverQueue){
      if(!message.member.voice.channel)
          return message.channel.send("Gotta be on voice chat for that");
      if(!serverQueue)
          return message.channel.send("What are you skipping?");
      serverQueue.connection.dispatcher.end();
  }
  function pause(serverQueue){
      if(!serverQueue.connection)
          return message.channel.send("What are you pausing fool?");
      if(!message.member.voice.channel)
          return message.channel.send("You are not in the voice channel!")
      if(serverQueue.connection.dispatcher.paused)
          return message.channel.send("The song is already paused");
      serverQueue.connection.dispatcher.pause();
      message.channel.send("The song has been paused!");
  }
  function resume(serverQueue){
      if(!serverQueue.connection)
          return message.channel.send("We have nothing to resume fool!");
      if(!message.member.voice.channel)
          return message.channel.send("You are not in the voice channel!")
      if(serverQueue.connection.dispatcher.resumed)
          return message.channel.send("Do you not hear the music imbecile?!");
      serverQueue.connection.dispatcher.resume();
      message.channel.send("We resumed!");
  }
})