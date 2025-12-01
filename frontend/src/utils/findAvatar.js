/*
 * Returns the avatar of the desired user, or the default if it does not exist.
 * Must be used in a page inside the pages folder 
 */
function findAvatar(avatarUser, backend) {
    // TODO: refactor into a custom hook for more complex avatar handling
    if (!avatarUser || !avatarUser.avatarUrl) {
        return "../../defaultAvatar.svg";
    } else {
        return `${backend}/avatars/${avatarUser.avatarUrl}`
    }
}

export default findAvatar;