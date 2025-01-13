import React, { useState } from 'react';
import './DownloadForm.css'; // Certifique-se de importar o arquivo CSS

const DownloadForm = () => {
    const [url, setUrl] = useState('');
    const [status, setStatus] = useState('');
    const [isDownloading, setIsDownloading] = useState(false);  // Estado para controlar se o download está em andamento
    const [progress, setProgress] = useState(0);  // Para armazenar o progresso

    const handleDownload = async (e) => {
        e.preventDefault();
        setStatus('Iniciando download...');
        setIsDownloading(true);  // Inicia o download
        setProgress(0);  // Reseta o progresso

        // Simula o aumento do progresso da barra fake
        let simulatedProgress = 0;
        const interval = setInterval(() => {
            if (simulatedProgress < 100) {
                simulatedProgress += 2;  // Aumenta o progresso lentamente (2% a cada intervalo)
                setProgress(simulatedProgress);
            }
        }, 300); // Atualiza a barra a cada 300ms (você pode ajustar esse tempo)

        try {
            const response = await fetch('http://localhost:5000/download', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url }),
            });

            if (response.ok) {
                const blob = await response.blob();
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = 'video.mp4';
                document.body.appendChild(link);
                link.click();
                link.remove();

                setStatus('Download concluído!');
                setIsDownloading(false);  // Finaliza o download
                clearInterval(interval);  // Limpa o intervalo quando o download termina
                setProgress(100);  // Garante que a barra fique 100% ao final
            } else {
                setStatus('Erro no download!');
                setIsDownloading(false);
                clearInterval(interval);  // Limpa o intervalo em caso de erro
            }
        } catch (error) {
            setStatus('Erro ao conectar ao servidor.');
            setIsDownloading(false);
            clearInterval(interval);  // Limpa o intervalo em caso de erro
        }
    };

    return (
        <div className="download-form">
            <h1>Baixar Vídeo do YouTube</h1>
            <form onSubmit={handleDownload}>
                <input
                    type="text"
                    placeholder="Cole o link do vídeo"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    required
                />
                <button type="submit" disabled={isDownloading}>
                    {isDownloading ? 'Baixando...' : 'Baixar'}
                </button>
            </form>
            {isDownloading && (
                <div className="progress-bar">
                    <div className="progress" style={{ width: `${progress}%` }}></div>
                </div>
            )}
            <p>{status}</p>
        </div>
    );
};

export default DownloadForm;


