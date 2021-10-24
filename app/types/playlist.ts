import { ObjectId } from "mongoose";

import { playlistStatuses } from "../util/constants";

interface Playlist {
    title: string;
    description: string;
    courses: ObjectId[] | string[] | any[]; // TODO: Course[]
    status: typeof playlistStatuses[number];
    creator: ObjectId | any; // TODO: User
}

export default Playlist;
