const outputArea = document.getElementById('outputArea');
const topicInput = document.getElementById('topicInput');
const teachInput = document.getElementById('teachInput');
const tagsInput = document.getElementById('tagsInput');
const uploadInput = document.getElementById('uploadInput');

function addMessage(title, content) {
  const node = document.createElement('div');
  node.className = 'msg';
  node.textContent = `${title}\n${content}`;
  outputArea.prepend(node);
}

async function postJSON(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || 'Request failed');
  }
  return payload;
}

document.getElementById('askBtn').onclick = async () => {
  try {
    const payload = await postJSON('/ask', { question: topicInput.value });
    addMessage('Answer', `${payload.answer}\nConfidence: ${payload.confidence}`);
  } catch (err) {
    addMessage('Error', err.message);
  }
};

document.getElementById('teachBtn').onclick = async () => {
  try {
    const payload = await postJSON('/teach', {
      title: topicInput.value,
      content: teachInput.value,
      tags: tagsInput.value
    });
    addMessage('Teach', `Stored topic: ${payload.topic.title}`);
  } catch (err) {
    addMessage('Error', err.message);
  }
};

document.getElementById('quizBtn').onclick = async () => {
  try {
    const payload = await postJSON('/quiz', { topic: topicInput.value, count: 5 });
    const text = payload.questions.map(q => `${q.question}\n${q.answer}`).join('\n\n');
    addMessage(`Quiz: ${payload.topic.title}`, text);
  } catch (err) {
    addMessage('Error', err.message);
  }
};

document.getElementById('flashBtn').onclick = async () => {
  try {
    const payload = await postJSON('/flashcards', { topic: topicInput.value, count: 6 });
    const text = payload.flashcards.map((c, idx) => `${idx + 1}. ${c.front}\n${c.back}`).join('\n\n');
    addMessage(`Flashcards: ${payload.topic.title}`, text);
  } catch (err) {
    addMessage('Error', err.message);
  }
};

document.getElementById('uploadBtn').onclick = async () => {
  try {
    const file = uploadInput.files[0];
    if (!file) throw new Error('Select an image first.');
    const response = await fetch(`/upload?filename=${encodeURIComponent(file.name)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: file
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Upload failed');
    addMessage('Upload', `Stored: ${payload.upload.original_name} (${payload.upload.size_bytes} bytes)`);
  } catch (err) {
    addMessage('Error', err.message);
  }
};
