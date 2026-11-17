const button = document.getElementById("clickBtn");
const message = document.getElementById("message");

button.addEventListener("click", () => {
  message.textContent = "It works!";
  message.classList.add("visible");
});
