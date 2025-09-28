import React from 'react';

function App() {
  return (
    <div style={{ padding: '20px', fontSize: '18px' }}>
      <h1>React Test - Step 2</h1>
      <p>Если вы видите этот текст без ошибок, React работает корректно</p>
      <button onClick={() => alert('React hooks работают!')}>
        Тест кнопки
      </button>
    </div>
  );
}

export default App;
