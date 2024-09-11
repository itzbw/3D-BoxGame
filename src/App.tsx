import { gameInit } from "./game";
import "./App.css";

function App() {
  return (
    <>
      <div>
        <div id="game" ref={(elem) => elem && gameInit(elem)} />
      </div>
    </>
  );
}

export default App;
