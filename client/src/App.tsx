import { createBrowserRouter, RouterProvider } from "react-router-dom";

import CreateRoom from "./components/CreateRoom";
import Room from "./components/Room";

const router = createBrowserRouter([
  { path: "/", element: <CreateRoom /> },
  { path: "/room/:roomId", element: <Room /> },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
