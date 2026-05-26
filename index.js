const express = require('express');
const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource } = require('@discordjs/voice');
const play = require('play-dl');

const app = express();
app.use(express.json()); // BDFD'den gelen JSON verilerini okumak için şart!

const PORT = process.env.PORT || 3000;
const botClients = new Map(); // Aktif bot bağlantılarını hafızada tutar

// API Ana Sayfa Kontrolü
app.get('/', (req, res) => {
    res.send('BDFD Gelişmiş Müzik API Sistemi Aktif!');
});

// BDFD Kodundaki $httpPost[.../api/play] Noktası
app.post('/api/play', async (req, res) => {
    const { bot_token, guild_id, user_id, query, text_channel_id } = req.body;

    // Eksik veri kontrolü
    if (!bot_token || !guild_id || !user_id || !query) {
        return res.status(400).json({ error: "Eksik parametre gönderildi." });
    }

    try {
        // 1. Botu başlat veya halihazırda açıksa hafızadan getir
        let client = botClients.get(bot_token);
        if (!client) {
            client = new Client({
                intents: [
                    GatewayIntentBits.Guilds,
                    GatewayIntentBits.GuildVoiceStates,
                    GatewayIntentBits.GuildMessages,
                    GatewayIntentBits.MessageContent
                ]
            });
            await client.login(bot_token);
            botClients.set(bot_token, client);
        }

        // 2. Sunucuyu ve Kullanıcıyı Çek
        const guild = await client.guilds.fetch(guild_id);
        const member = await guild.members.fetch(user_id);
        const voiceChannel = member.voice.channel;

        if (!voiceChannel) {
            return res.status(400).json({ error: "Önce bir ses kanalına katılmalısın!" });
        }

        // 3. YouTube Üzerinde Şarkıyı Ara
        const searchResult = await play.search(query, { limit: 1 });
        if (searchResult.length === 0) {
            return res.status(404).json({ error: "Şarkı bulunamadı." });
        }
        const video = searchResult[0];

        // 4. Ses Kanalına Bağlanma İşlemi
        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
        });

        // 5. Ses Akışını (Stream) Başlatma
        const stream = await play.stream(video.url);
        const resource = createAudioResource(stream.stream, { inputType: stream.type });
        const player = createAudioPlayer();

        player.play(resource);
        connection.subscribe(player);

        // 6. BDFD Sunucusundaki Metin Kanalına Bilgilendirme Mesajı Gönder
        try {
            const channel = await guild.channels.fetch(text_channel_id);
            if (channel) {
                channel.send(`🎵 **${video.title}** başarıyla oynatılıyor! (Süre: ${video.durationRaw})`);
            }
        } catch (err) {
            console.log("Metin kanalına mesaj gönderilemedi.");
        }

        // BDFD'ye başarılı yanıt dönüyoruz
        res.json({ success: true, message: "Müzik başlatıldı.", title: video.title });

    } catch (error) {
        console.error("Sistem Hatası:", error);
        res.status(500).json({ error: "Müzik oynatılırken backend hatası oluştu." });
    }
});

app.listen(PORT, () => {
    console.log(`Müzik API Sunucusu ${PORT} portunda çalışıyor.`);
});
