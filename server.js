const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const ytdlp = require('yt-dlp-exec');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process'); // Usar spawn para FFmpeg

const app = express();
const PORT = process.env.PORT || 5000;

// Diretório de downloads
const downloadDir = path.join(__dirname, 'downloads');

// Cria o diretório de downloads, se não existir
if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir);
}

app.use(cors());
app.use(bodyParser.json());

// Função para baixar arquivos com yt-dlp
const downloadFile = async (url, output, format) => {
    return ytdlp(url, { output, format });
};

// Função para mesclar vídeo e áudio com FFmpeg
const mergeFiles = (videoPath, audioPath, outputPath) => {
    return new Promise((resolve, reject) => {
        const ffmpeg = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-i', videoPath, '-i', audioPath, '-c:v', 'libx264', '-c:a', 'aac', '-strict', 'experimental', '-preset', 'fast', outputPath]);

        ffmpeg.on('close', (code) => {
            if (code !== 0) {
                return reject(new Error('Erro ao mesclar o vídeo e áudio.'));
            }
            resolve(outputPath);
        });

        ffmpeg.on('error', (err) => {
            reject(new Error('Erro ao iniciar o processo FFmpeg.'));
        });
    });
};

// Função para garantir que o arquivo foi liberado antes de tentar excluir
const safelyDeleteFile = (filePath) => {
    return new Promise((resolve, reject) => {
        // Verificar se o arquivo existe e tentar excluí-lo de forma assíncrona
        fs.promises.unlink(filePath)
            .then(() => {
                console.log(`Arquivo excluído com sucesso: ${filePath}`);
                resolve();
            })
            .catch((err) => {
                reject(err);
            });
    });
};

// Rota para baixar vídeo do YouTube
app.post('/download', async (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'URL não fornecida' });
    }

    const timestamp = Date.now();
    const tempVideo = path.join(downloadDir, `video-${timestamp}.mp4`);
    const tempAudio = path.join(downloadDir, `audio-${timestamp}.m4a`);
    const finalOutput = path.join(downloadDir, `final-${timestamp}.mp4`);

    try {
        console.log(`Baixando vídeo de: ${url}`);
        await downloadFile(url, tempVideo, 'bestvideo');
        await downloadFile(url, tempAudio, 'bestaudio');
        console.log('Download concluído. Mesclando arquivos...');

        await mergeFiles(tempVideo, tempAudio, finalOutput);

        // Excluir arquivos temporários após o envio do arquivo
        res.setHeader('Content-Disposition', `attachment; filename="${path.basename(finalOutput)}"`);
        res.setHeader('Content-Type', 'video/mp4');
        
        // Enviar arquivo final
        res.sendFile(finalOutput, async (err) => {
            if (err) {
                console.error('Erro ao enviar o arquivo:', err);
                return res.status(500).json({ error: 'Erro ao enviar o arquivo final' });
            }

            console.log('Arquivo enviado com sucesso.');

            // Excluir arquivos temporários após o envio
            try {
                // Aguardar 2 segundos antes de excluir os arquivos temporários
                await safelyDeleteFile(tempVideo);
                await safelyDeleteFile(tempAudio);
                await safelyDeleteFile(finalOutput);
            } catch (cleanupError) {
                console.error('Erro ao limpar arquivos temporários:', cleanupError.message);
            }
        });

    } catch (error) {
        console.error('Erro no processo:', error.message);

        // Excluir arquivos temporários em caso de erro
        try {
            await safelyDeleteFile(tempVideo);
            await safelyDeleteFile(tempAudio);
            await safelyDeleteFile(finalOutput);
        } catch (cleanupError) {
            console.error('Erro ao limpar arquivos temporários após falha:', cleanupError.message);
        }

        res.status(500).json({ error: error.message || 'Erro no processo de download e mesclagem' });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});





