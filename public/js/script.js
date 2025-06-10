document.addEventListener('DOMContentLoaded', () => {
    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');

    // Music control setup
    const musicControls = document.getElementById('musicControls');
    const musicIcon = document.getElementById('musicIcon');
    const backgroundMusic = document.getElementById('backgroundMusic');
    let isMusicPlaying = false;
    let isAudioLoaded = false;

    // Set initial volume for peaceful background music
    backgroundMusic.volume = 0.3;

    // Function to load audio
    function loadAudio() {
        return new Promise((resolve, reject) => {
            if (isAudioLoaded) {
                resolve();
                return;
            }

            backgroundMusic.load();
            
            backgroundMusic.addEventListener('canplaythrough', () => {
                isAudioLoaded = true;
                resolve();
            }, { once: true });

            backgroundMusic.addEventListener('error', (e) => {
                reject(new Error('Failed to load audio file'));
            }, { once: true });
        });
    }

    // Function to handle music playback
    async function toggleMusic() {
        try {
            if (!isAudioLoaded) {
                await loadAudio();
            }

            if (isMusicPlaying) {
                backgroundMusic.pause();
                musicIcon.src = 'assets/music-play.svg';
            } else {
                const playPromise = backgroundMusic.play();
                if (playPromise !== undefined) {
                    await playPromise;
                    musicIcon.src = 'assets/music-pause.svg';
                }
            }
            isMusicPlaying = !isMusicPlaying;
        } catch (err) {
            console.error('Music playback error:', err);
            alert('Unable to play music. Please check if your browser allows audio playback.');
        }
    }

    // Handle music controls click
    musicControls.addEventListener('click', toggleMusic);

    // Try to load audio when page loads
    loadAudio().catch(err => console.warn('Initial audio load failed:', err));

    // Start music on first interaction
    document.addEventListener('click', () => {
        if (!isMusicPlaying) {
            toggleMusic();
        }
    }, { once: true });

    // Smooth scroll to bottom
    function scrollToBottom(smooth = true) {
        const scrollOptions = {
            top: chatMessages.scrollHeight,
            behavior: smooth ? 'smooth' : 'auto'
        };
        chatMessages.scrollTo(scrollOptions);
    }

    // Check if we should scroll
    function shouldScrollToBottom() {
        const threshold = 100; // pixels from bottom
        const distanceFromBottom = 
            chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight;
        return distanceFromBottom <= threshold;
    }

    // Handle sending messages
    async function sendMessage() {
        const message = userInput.value.trim();
        if (!message) return;

        // Add devotee's message
        addMessage(message, 'devotee');
        userInput.value = '';

        // Show loading indicator
        const loadingMessage = addMessage('॥ Contemplating your words... ॥', 'krishna');
        
        // Always scroll to bottom after user sends message
        scrollToBottom();

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message }),
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();
            
            // Remove loading message
            loadingMessage.remove();
            
            // Format and add Krishna's response
            addMessage(data.response, 'krishna');
            
            // Scroll to the latest message
            scrollToBottom();
        } catch (error) {
            console.error('Error:', error);
            loadingMessage.remove();
            addMessage('My dear devotee, there seems to be a temporary disturbance in our connection. Please try again in a moment. 🙏', 'krishna');
            scrollToBottom();
        }
    }

    // Add a message to the chat
    function addMessage(text, type) {
        const shouldScroll = shouldScrollToBottom();
        
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', type);
        
        const contentDiv = document.createElement('div');
        contentDiv.classList.add('message-content');
        
        // Format the message content
        if (type === 'devotee') {
            contentDiv.textContent = text;
        } else {
            // For Krishna's messages, preserve formatting and add fade-in effect
            contentDiv.innerHTML = text.replace(/\n/g, '<br>');
            messageDiv.style.opacity = '0';
            messageDiv.style.transform = 'translateY(20px)';
            setTimeout(() => {
                messageDiv.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                messageDiv.style.opacity = '1';
                messageDiv.style.transform = 'translateY(0)';
            }, 100);
        }
        
        messageDiv.appendChild(contentDiv);
        chatMessages.appendChild(messageDiv);
        
        if (shouldScroll) {
            scrollToBottom();
        }
        
        return messageDiv;
    }

    // Handle textarea auto-resize
    userInput.addEventListener('input', () => {
        userInput.style.height = 'auto';
        userInput.style.height = Math.min(userInput.scrollHeight, 150) + 'px';
    });

    // Event listeners
    sendButton.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Focus input on load
    userInput.focus();

    // Initial scroll to bottom
    scrollToBottom(false);
});
