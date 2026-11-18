// Widget de Chat para o índice
import ChatManager from './chat.js';

class ChatWidget {
    constructor() {
        this.chatManager = new ChatManager();
        this.isOpen = false;
        this.init();
    }

    init() {
        this.createWidgetHTML();
        this.attachEventListeners();
        this.applyPersistedSubmissionState();
        this.loadResponses();
    }

    createWidgetHTML() {
        // Se widget já existe, não criar novamente
        if (document.getElementById('chat-widget-container')) {
            return;
        }

        const widgetHTML = `
            <div id="chat-widget-container">
                <!-- Botão de Chat Flutuante -->
                <button id="chat-widget-toggle" class="chat-widget-button" title="Envie uma mensagem">
                    <i class="fas fa-comments"></i>
                    <span class="chat-widget-badge" id="unread-badge" style="display: none;">!</span>
                </button>

                <!-- Widget de Chat -->
                <div class="chat-widget" id="chat-widget">
                    <div class="chat-widget-header">
                        <div>
                            <h3>Deixe uma mensagem</h3>
                            <p>Responderei em breve</p>
                        </div>
                        <button id="chat-widget-close" class="chat-widget-close">
                            <i class="fas fa-xmark"></i>
                        </button>
                    </div>

                    <div class="chat-widget-content">
                        <div id="chat-widget-messages" class="chat-widget-messages">
                            <!-- Mensagens aparecerão aqui -->
                        </div>

                        <div class="chat-widget-input">
                            <form id="chat-form">
                                <div class="form-group">
                                    <input 
                                        type="text" 
                                        id="chat-name" 
                                        placeholder="Seu nome"
                                        required
                                        autocomplete="name"
                                    >
                                </div>

                                <div class="form-group">
                                    <textarea 
                                        id="chat-message" 
                                        placeholder="Sua mensagem..."
                                        rows="3"
                                        required
                                        maxlength="500"
                                    ></textarea>
                                    <small id="char-count">0/500</small>
                                </div>

                                <button type="submit" class="btn-send">
                                    <i class="fas fa-paper-plane"></i>
                                    Enviar
                                </button>

                                <div id="chat-status" style="margin-top: 10px; text-align: center; font-size: 12px;"></div>
                            </form>
                            <div id="chat-after-submit" class="chat-widget-after" style="display: none;">
                                <div class="chat-after-icon">
                                    <i class="fas fa-check"></i>
                                </div>
                                <p class="chat-widget-after-title">Mensagem enviada</p>
                                <p class="chat-widget-after-text">Obrigado! Assim que eu responder, a mensagem vai aparecer aqui.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const styleHTML = `
            <style id="chat-widget-styles">
                /* ============================================
                   Chat Widget — Dark Theme
                   ============================================ */
                #chat-widget-container {
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    position: fixed;
                    bottom: 24px;
                    right: 24px;
                    z-index: 999;
                }

                /* --- Toggle Button --- */
                .chat-widget-button {
                    width: 54px;
                    height: 54px;
                    border-radius: 16px;
                    background: rgba(96, 165, 250, 0.15);
                    border: 1px solid rgba(96, 165, 250, 0.25);
                    color: #93c5fd;
                    cursor: pointer;
                    font-size: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    transition: all 220ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
                    position: relative;
                }

                .chat-widget-button:hover {
                    background: rgba(96, 165, 250, 0.25);
                    border-color: rgba(96, 165, 250, 0.4);
                    transform: translateY(-2px);
                    box-shadow: 0 8px 24px -6px rgba(96, 165, 250, 0.25);
                }

                .chat-widget-button:active {
                    transform: translateY(0) scale(0.96);
                }

                .chat-widget-badge {
                    position: absolute;
                    top: -4px;
                    right: -4px;
                    background: #ef4444;
                    color: white;
                    border-radius: 50%;
                    width: 20px;
                    height: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 10px;
                    font-weight: 700;
                    border: 2px solid #06080f;
                }

                /* --- Chat Panel --- */
                .chat-widget {
                    position: absolute;
                    bottom: 68px;
                    right: 0;
                    width: 380px;
                    max-height: 540px;
                    background: #0c1017;
                    border: 1px solid rgba(130, 150, 180, 0.12);
                    border-radius: 20px;
                    box-shadow:
                        0 1px 0 0 rgba(255, 255, 255, 0.03) inset,
                        0 24px 56px -12px rgba(0, 0, 0, 0.7);
                    display: none;
                    flex-direction: column;
                    overflow: hidden;
                    animation: chatSlideUp 280ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }

                .chat-widget.open {
                    display: flex;
                }

                @keyframes chatSlideUp {
                    from {
                        opacity: 0;
                        transform: translateY(12px) scale(0.97);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }

                /* --- Header --- */
                .chat-widget-header {
                    padding: 18px 20px;
                    background: rgba(18, 24, 38, 0.9);
                    border-bottom: 1px solid rgba(130, 150, 180, 0.1);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .chat-widget-header h3 {
                    margin: 0;
                    font-size: 0.95rem;
                    font-weight: 600;
                    color: #eaf0f9;
                    letter-spacing: -0.01em;
                }

                .chat-widget-header p {
                    margin: 3px 0 0 0;
                    font-size: 0.72rem;
                    color: #7b8ba3;
                    letter-spacing: 0.01em;
                }

                .chat-widget-close {
                    background: rgba(130, 150, 180, 0.08);
                    border: 1px solid rgba(130, 150, 180, 0.1);
                    color: #7b8ba3;
                    cursor: pointer;
                    width: 32px;
                    height: 32px;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.85rem;
                    transition: all 180ms ease;
                }

                .chat-widget-close:hover {
                    background: rgba(130, 150, 180, 0.15);
                    color: #eaf0f9;
                }

                /* --- Messages Area --- */
                .chat-widget-content {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }

                .chat-widget-messages {
                    flex: 1;
                    overflow-y: auto;
                    padding: 16px;
                    background: rgba(8, 11, 20, 0.6);
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    min-height: 60px;
                }

                .chat-widget-messages::-webkit-scrollbar {
                    width: 4px;
                }

                .chat-widget-messages::-webkit-scrollbar-track {
                    background: transparent;
                }

                .chat-widget-messages::-webkit-scrollbar-thumb {
                    background: rgba(130, 150, 180, 0.15);
                    border-radius: 999px;
                }

                .chat-widget-message {
                    padding: 10px 14px;
                    border-radius: 14px;
                    font-size: 0.82rem;
                    line-height: 1.5;
                    max-width: 85%;
                    word-wrap: break-word;
                    animation: msgFadeIn 240ms ease;
                }

                @keyframes msgFadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(6px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .chat-widget-message.user {
                    background: rgba(96, 165, 250, 0.15);
                    border: 1px solid rgba(96, 165, 250, 0.2);
                    color: #93c5fd;
                    align-self: flex-end;
                    border-bottom-right-radius: 4px;
                }

                .chat-widget-message.admin {
                    background: rgba(18, 24, 38, 0.8);
                    border: 1px solid rgba(130, 150, 180, 0.12);
                    color: #c0cbdb;
                    align-self: flex-start;
                    border-bottom-left-radius: 4px;
                }

                /* --- Input Area --- */
                .chat-widget-input {
                    padding: 16px;
                    background: rgba(12, 17, 28, 0.95);
                    border-top: 1px solid rgba(130, 150, 180, 0.1);
                }

                .form-group {
                    margin-bottom: 10px;
                }

                #chat-name,
                #chat-message {
                    width: 100%;
                    padding: 10px 14px;
                    background: rgba(18, 24, 38, 0.7);
                    border: 1px solid rgba(130, 150, 180, 0.12);
                    border-radius: 12px;
                    color: #eaf0f9;
                    font-family: inherit;
                    font-size: 0.82rem;
                    transition: all 180ms ease;
                    resize: none;
                }

                #chat-name::placeholder,
                #chat-message::placeholder {
                    color: rgba(123, 139, 163, 0.6);
                }

                #chat-name:focus,
                #chat-message:focus {
                    outline: none;
                    border-color: rgba(96, 165, 250, 0.35);
                    background: rgba(18, 24, 38, 0.9);
                    box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.08);
                }

                #chat-message {
                    min-height: 56px;
                }

                #chat-widget-container small {
                    display: block;
                    text-align: right;
                    color: #5a6a80;
                    font-size: 0.68rem;
                    margin-top: 4px;
                    font-family: 'JetBrains Mono', monospace;
                }

                /* --- Send Button --- */
                .btn-send {
                    width: 100%;
                    padding: 10px;
                    background: rgba(96, 165, 250, 0.12);
                    border: 1px solid rgba(96, 165, 250, 0.2);
                    color: #93c5fd;
                    border-radius: 12px;
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 0.82rem;
                    font-family: inherit;
                    transition: all 220ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 7px;
                }

                .btn-send:hover {
                    background: rgba(96, 165, 250, 0.2);
                    border-color: rgba(96, 165, 250, 0.35);
                    transform: translateY(-1px);
                    box-shadow: 0 4px 14px -4px rgba(96, 165, 250, 0.2);
                }

                .btn-send:active {
                    transform: translateY(0);
                }

                .btn-send:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                    transform: none;
                }

                /* --- Status --- */
                #chat-status {
                    color: #60a5fa;
                    font-size: 0.75rem;
                }

                /* --- After Submit --- */
                .chat-widget-after {
                    background: rgba(18, 24, 38, 0.6);
                    border: 1px solid rgba(130, 150, 180, 0.1);
                    border-radius: 14px;
                    padding: 20px 16px;
                    text-align: center;
                }

                .chat-after-icon {
                    width: 40px;
                    height: 40px;
                    border-radius: 12px;
                    background: rgba(52, 211, 153, 0.12);
                    border: 1px solid rgba(52, 211, 153, 0.2);
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    color: #34d399;
                    font-size: 1rem;
                    margin-bottom: 10px;
                }

                .chat-widget-after-title {
                    margin: 0 0 6px 0;
                    font-size: 0.88rem;
                    font-weight: 600;
                    color: #34d399;
                }

                .chat-widget-after-text {
                    margin: 0;
                    font-size: 0.78rem;
                    color: #7b8ba3;
                    line-height: 1.5;
                }

                /* --- Mobile --- */
                @media (max-width: 600px) {
                    #chat-widget-container {
                        bottom: 16px;
                        right: 16px;
                    }

                    .chat-widget {
                        position: fixed;
                        width: calc(100vw - 32px);
                        max-height: 70vh;
                        bottom: 80px;
                        right: 16px;
                        left: 16px;
                        border-radius: 18px;
                    }

                    .chat-widget-button {
                        width: 48px;
                        height: 48px;
                        border-radius: 14px;
                        font-size: 18px;
                    }

                    .chat-widget-header {
                        padding: 14px 16px;
                    }

                    .chat-widget-messages {
                        padding: 12px;
                    }

                    .chat-widget-message {
                        font-size: 0.78rem;
                        max-width: 90%;
                    }

                    .chat-widget-input {
                        padding: 12px;
                    }

                    #chat-name,
                    #chat-message {
                        font-size: 14px;
                        padding: 9px 12px;
                    }

                    .btn-send {
                        font-size: 0.78rem;
                        padding: 9px;
                    }
                }
            </style>
        `;

        // Inserir HTML e CSS
        document.body.insertAdjacentHTML('beforeend', widgetHTML + styleHTML);
    }

    attachEventListeners() {
        const toggleBtn = document.getElementById('chat-widget-toggle');
        const closeBtn = document.getElementById('chat-widget-close');
        const form = document.getElementById('chat-form');
        const messageInput = document.getElementById('chat-message');

        toggleBtn.addEventListener('click', () => this.toggleWidget());
        closeBtn.addEventListener('click', () => this.toggleWidget());
        form.addEventListener('submit', (e) => this.handleSubmit(e));

        // Contador de caracteres
        messageInput.addEventListener('input', (e) => {
            const count = e.target.value.length;
            document.getElementById('char-count').textContent = `${count}/500`;
        });

        // Fechar ao clicar fora
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#chat-widget-container')) {
                this.closeWidget();
            }
        });
    }

    toggleWidget() {
        this.isOpen ? this.closeWidget() : this.openWidget();
    }

    openWidget() {
        document.getElementById('chat-widget').classList.add('open');
        this.isOpen = true;
        if (localStorage.getItem('chat_widget_submitted') !== '1') {
            document.getElementById('chat-name').focus();
        }
    }

    closeWidget() {
        document.getElementById('chat-widget').classList.remove('open');
        this.isOpen = false;
    }

    async handleSubmit(e) {
        e.preventDefault();

        const nomeInput = document.getElementById('chat-name');
        const mensagemInput = document.getElementById('chat-message');
        const nome = nomeInput.value.trim();
        const mensagem = mensagemInput.value.trim();
        const statusDiv = document.getElementById('chat-status');
        const submitBtn = document.querySelector('.btn-send');

        if (!nome || !mensagem) {
            statusDiv.textContent = '❌ Preencha todos os campos';
            return;
        }

        submitBtn.disabled = true;
        statusDiv.textContent = '⏳ Enviando...';

        const result = await this.chatManager.sendMessage(nome, mensagem);

        if (result.success) {
            // Guardar chat_id e nome para carregar respostas depois
            localStorage.setItem('current_chat_id', result.chatId);
            localStorage.setItem('current_chat_name', nome);
            localStorage.setItem('chat_widget_submitted', '1');

            // Adicionar mensagem ao widget
            this.addMessageToWidget(mensagem, 'user');

            // Limpar inputs
            nomeInput.value = '';
            mensagemInput.value = '';
            
            // Disparar evento de input para atualizar contador
            const event = new Event('input', { bubbles: true });
            mensagemInput.dispatchEvent(event);
            
            document.getElementById('char-count').textContent = '0/500';

            statusDiv.textContent = '✓ Mensagem enviada!';
            statusDiv.style.color = '#34d399';

            // Carregar respostas
            this.loadResponses(nome);

            // Esconder o formulario apos o primeiro envio
            this.setSubmissionUI(true);

            setTimeout(() => {
                statusDiv.textContent = '';
                statusDiv.style.color = '#60a5fa';
            }, 3000);
        } else {
            statusDiv.textContent = `❌ Erro: ${result.error}`;
            statusDiv.style.color = '#ef4444';
        }

        submitBtn.disabled = false;
    }

    addMessageToWidget(text, type, messageId = null) {
        const messagesDiv = document.getElementById('chat-widget-messages');
        const msgElement = document.createElement('div');
        msgElement.className = `chat-widget-message ${type}`;
        msgElement.textContent = text;
        if (messageId) {
            msgElement.setAttribute('data-msg-id', messageId);
        }
        messagesDiv.appendChild(msgElement);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    loadResponses(nome) {
        // Carregar respostas do admin para este visitante
        if (!nome) {
            nome = localStorage.getItem('current_chat_name');
        }

        if (nome) {
            const unsubscribe = this.chatManager.onChatsLoad((chats) => {
                // Encontrar chats do visitante atual
                const userChats = chats.filter(chat => chat.nome.toLowerCase() === nome.toLowerCase());

                userChats.forEach(chat => {
                    this.chatManager.onChatMessagesLoad(chat.chatId, (messages) => {
                        // Mostrar apenas respostas do admin
                        messages.forEach(msg => {
                            if (msg.resposta && msg.respondido && !document.querySelector(`[data-msg-id="${msg.id}"]`)) {
                                this.addMessageToWidget(msg.resposta, 'admin', msg.id);
                            }
                        });
                    });
                });
            });
        }
    }

    applyPersistedSubmissionState() {
        if (localStorage.getItem('chat_widget_submitted') === '1') {
            this.setSubmissionUI(true);
        }
    }

    setSubmissionUI(isSubmitted) {
        const form = document.getElementById('chat-form');
        const after = document.getElementById('chat-after-submit');
        if (!form || !after) return;
        form.style.display = isSubmitted ? 'none' : '';
        after.style.display = isSubmitted ? 'block' : 'none';
    }
}

// Inicializar widget quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new ChatWidget();
    });
} else {
    new ChatWidget();
}

export default ChatWidget;
