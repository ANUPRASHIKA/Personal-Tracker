import { useEffect, useRef, useState } from 'react';

const OPS = {
  '+': (a, b) => a + b,
  '-': (a, b) => a - b,
  '×': (a, b) => a * b,
  '÷': (a, b) => (b === 0 ? NaN : a / b),
};

// Minimal 4-function calculator state machine (no eval()). Chains operations like a real calculator:
// pressing an operator applies any pending operation first, so 5 + 3 × 2 computes left-to-right (16).
export default function Calculator() {
  const [display, setDisplay] = useState('0');
  const [prev, setPrev] = useState(null);
  const [operator, setOperator] = useState(null);
  const [waiting, setWaiting] = useState(false);
  const rootRef = useRef(null);

  // Auto-focus on mount so keyboard input works immediately without clicking inside first.
  useEffect(() => { rootRef.current?.focus(); }, []);

  function inputDigit(d) {
    if (waiting) { setDisplay(d); setWaiting(false); return; }
    setDisplay(display === '0' ? d : display + d);
  }

  function inputDecimal() {
    if (waiting) { setDisplay('0.'); setWaiting(false); return; }
    if (!display.includes('.')) setDisplay(display + '.');
  }

  function clearAll() {
    setDisplay('0'); setPrev(null); setOperator(null); setWaiting(false);
  }

  function toggleSign() {
    if (display === '0') return;
    setDisplay(display.startsWith('-') ? display.slice(1) : '-' + display);
  }

  function percent() {
    const value = Number(display);
    // With a pending +/- op, "%" means a percentage OF the first operand (e.g. 200 - 10% = 200 - 20),
    // matching standard calculator behavior. Otherwise (×/÷ or no pending op) it's just value/100.
    if (prev != null && (operator === '+' || operator === '-')) {
      setDisplay(String((prev * value) / 100));
    } else {
      setDisplay(String(value / 100));
    }
    setWaiting(false);
  }

  function backspace() {
    if (waiting) return;
    setDisplay(display.length > 1 ? display.slice(0, -1) : '0');
  }

  function applyPending(nextValue) {
    if (prev == null) return nextValue;
    return OPS[operator](prev, nextValue);
  }

  function chooseOperator(nextOp) {
    const value = Number(display);
    setPrev(operator && !waiting ? applyPending(value) : value);
    setOperator(nextOp);
    setWaiting(true);
    if (operator && !waiting) setDisplay(String(applyPending(value)));
  }

  function equals() {
    if (!operator) return;
    const result = applyPending(Number(display));
    setDisplay(String(Number.isFinite(result) ? result : 'Error'));
    setPrev(null);
    setOperator(null);
    setWaiting(true);
  }

  function handleKeyDown(e) {
    const { key } = e;
    if (/^[0-9]$/.test(key)) { inputDigit(key); return; }
    if (key === '.') { inputDecimal(); return; }
    if (key === '+' || key === '-') { chooseOperator(key); return; }
    if (key === '*') { chooseOperator('×'); return; }
    if (key === '/') { e.preventDefault(); chooseOperator('÷'); return; }
    if (key === '%') { percent(); return; }
    if (key === 'Enter' || key === '=') { e.preventDefault(); equals(); return; }
    if (key === 'Escape') { clearAll(); return; }
    if (key === 'Backspace') { backspace(); }
  }

  return (
    <div className="calculator" tabIndex={0} ref={rootRef} onKeyDown={handleKeyDown}>
      <div className="calc-expression">{prev != null ? `${prev} ${operator}` : ' '}</div>
      <div className="calc-display">{display}</div>
      <div className="calc-grid">
        <button className="calc-btn calc-btn-fn" onClick={clearAll}>AC</button>
        <button className="calc-btn calc-btn-fn" onClick={toggleSign}>±</button>
        <button className="calc-btn calc-btn-fn" onClick={percent}>%</button>
        <button className="calc-btn calc-btn-op" onClick={() => chooseOperator('÷')}>÷</button>

        <button className="calc-btn" onClick={() => inputDigit('7')}>7</button>
        <button className="calc-btn" onClick={() => inputDigit('8')}>8</button>
        <button className="calc-btn" onClick={() => inputDigit('9')}>9</button>
        <button className="calc-btn calc-btn-op" onClick={() => chooseOperator('×')}>×</button>

        <button className="calc-btn" onClick={() => inputDigit('4')}>4</button>
        <button className="calc-btn" onClick={() => inputDigit('5')}>5</button>
        <button className="calc-btn" onClick={() => inputDigit('6')}>6</button>
        <button className="calc-btn calc-btn-op" onClick={() => chooseOperator('-')}>−</button>

        <button className="calc-btn" onClick={() => inputDigit('1')}>1</button>
        <button className="calc-btn" onClick={() => inputDigit('2')}>2</button>
        <button className="calc-btn" onClick={() => inputDigit('3')}>3</button>
        <button className="calc-btn calc-btn-op" onClick={() => chooseOperator('+')}>+</button>

        <button className="calc-btn calc-btn-wide" onClick={() => inputDigit('0')}>0</button>
        <button className="calc-btn" onClick={inputDecimal}>.</button>
        <button className="calc-btn calc-btn-eq" onClick={equals}>=</button>
      </div>
    </div>
  );
}
