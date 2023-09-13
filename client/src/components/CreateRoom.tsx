import { useNavigate } from "react-router-dom";
import { apiUrl } from "../constants";

const CreateRoom = () => {
  const navigate = useNavigate();

  const create = async () => {
    const { roomId } = await (await fetch(`${apiUrl}/create`)).json();

    navigate(`/room/${roomId}`);
  };

  return (
    <div>
      <button onClick={create}>Create room</button>
    </div>
  );
};

export default CreateRoom;
