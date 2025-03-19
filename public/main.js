document.addEventListener("DOMContentLoaded", () => {
  const FADE_TIME = 150; // ms
  const TYPING_TIMER_LENGTH = 400; // ms
  const COLORS = [
    "#e21400", "#91580f", "#f8a700", "#f78b00",
    "#58dc00", "#287b00", "#a8f07a", "#4ae8c4",
    "#3b88eb", "#3824aa", "#a700ff", "#d300e7"
  ];

  const usernameInput = document.querySelector(".usernameInput");
  const messages = document.querySelector(".messages");
  const inputMessage = document.querySelector(".inputMessage");
  const loginPage = document.querySelector(".login.page");
  const chatPage = document.querySelector(".chat.page");

  const socket = io();

  let username;
  let connected = false;
  let typing = false;
  let lastTypingTime;
  let currentInput = usernameInput;
  currentInput.focus();

  const addParticipantsMessage = (data) => {
    let message = data.numUsers === 1 ? "there's 1 participant" : `there are ${data.numUsers} participants`;
    log(message);
  };

  const setUsername = () => {
    username = cleanInput(usernameInput.value.trim());
    if (username) {
      loginPage.style.display = "none";
      chatPage.style.display = "block";
      currentInput = inputMessage;
      inputMessage.focus();
      socket.emit("add user", username);
    }
  };

  const sendMessage = () => {
    let message = cleanInput(inputMessage.value);
    if (message && connected) {
      inputMessage.value = "";
      addChatMessage({ username, message });
      socket.emit("new message", message);
    }
  };

  const log = (message) => {
    const el = document.createElement("li");
    el.classList.add("log");
    el.textContent = message;
    messages.appendChild(el);
  };

  const addChatMessage = (data) => {
    const messageDiv = document.createElement("li");
    messageDiv.classList.add("message");
    messageDiv.dataset.username = data.username;

    const usernameSpan = document.createElement("span");
    usernameSpan.classList.add("username");
    usernameSpan.textContent = data.username;
    usernameSpan.style.color = getUsernameColor(data.username);

    const messageBodySpan = document.createElement("span");
    messageBodySpan.classList.add("messageBody");
    messageBodySpan.textContent = data.message;

    messageDiv.append(usernameSpan, messageBodySpan);
    messages.appendChild(messageDiv);
  };

  const cleanInput = (input) => {
    return input.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  };

  const updateTyping = () => {
    if (connected && !typing) {
      typing = true;
      socket.emit("typing");
    }
    lastTypingTime = Date.now();

    setTimeout(() => {
      const timeDiff = Date.now() - lastTypingTime;
      if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
        socket.emit("stop typing");
        typing = false;
      }
    }, TYPING_TIMER_LENGTH);
  };

  const getUsernameColor = (username) => {
    let hash = 7;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + (hash << 5) - hash;
    }
    return COLORS[Math.abs(hash % COLORS.length)];
  };

  document.addEventListener("keydown", (event) => {
    if (!event.ctrlKey && !event.metaKey && !event.altKey) {
      currentInput.focus();
    }
    if (event.key === "Enter") {
      if (username) {
        sendMessage();
        socket.emit("stop typing");
        typing = false;
      } else {
        setUsername();
      }
    }
  });

  inputMessage.addEventListener("input", updateTyping);

  loginPage.addEventListener("click", () => currentInput.focus());
  inputMessage.addEventListener("click", () => inputMessage.focus());

  socket.on("login", (data) => {
    connected = true;
    log("Welcome to Socket.IO Chat");
    addParticipantsMessage(data);
  });

  socket.on("new message", (data) => addChatMessage(data));
  socket.on("user joined", (data) => log(`${data.username} joined`));
  socket.on("user left", (data) => log(`${data.username} left`));
  socket.on("typing", (data) => log(`${data.username} is typing...`));
  socket.on("stop typing", () => log(""));

  socket.on("disconnect", () => log("you have been disconnected"));
  socket.io.on("reconnect", () => {
    log("you have been reconnected");
    if (username) {
      socket.emit("add user", username);
    }
  });

  socket.io.on("reconnect_error", () => log("attempt to reconnect has failed"));

  setInterval(() => {
    document.querySelectorAll(".log").forEach(log => log.remove());
  }, 5000);
});
