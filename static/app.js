const topicInput = document.getElementById('topicInput');
const contentInput = document.getElementById('contentInput');
const output = document.getElementById('output');

const show = (data) => {
  output.textContent = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
};

async function postJson(url, payload) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(payload)
  });
  return res.json();
}

document.getElementById('askBtn').onclick = async () => {
  const question = contentInput.value.trim();
  show(await postJson('/api/ask', {question}));
};

document.getElementById('teachBtn').onclick = async () => {
  const topic = topicInput.value.trim();
  const content = contentInput.value.trim();
  show(await postJson('/api/teach', {topic, content}));
};

document.getElementById('quizBtn').onclick = async () => {
  const topic = topicInput.value.trim() || contentInput.value.trim();
  show(await postJson('/api/quiz', {topic, count: 5}));
};

document.getElementById('flashBtn').onclick = async () => {
  const topic = topicInput.value.trim() || contentInput.value.trim();
  show(await postJson('/api/flashcards', {topic, count: 6}));
};

document.getElementById('uploadBtn').onclick = async () => {
  const fileInput = document.getElementById('fileInput');
  if (!fileInput.files.length) {
    show('Please select an image first.');
    return;
  }
  const formData = new FormData();
  formData.append('file', fileInput.files[0]);
  const res = await fetch('/api/upload', {method: 'POST', body: formData});
  show(await res.json());
};
