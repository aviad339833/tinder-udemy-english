# Tinder-like Dating App with Firestore

Building a dating app similar to Tinder involves creating a robust data structure that allows for efficient querying and modifications. Based on your requirements, here's a suggested Firestore data structure and corresponding operations:

## Firestore Structure:

### 1. **Users Collection**:

- Each document represents a user.
- Document fields:
  - `id`
  - `name`
  - `profilePicURL`
  - `bio`
  - etc.

### 2. **Interactions Sub-collection (for each user)**:

- Each document represents an interaction (like, dislike).
- Document fields:
  - `targetUserId`
  - `interactionType`
  - `timestamp`

### 3. **Matches Sub-collection (for each user)**:

- Each document represents a mutual match.
- Document fields:
  - `matchedUserId`
  - `timestamp`
  - `chatId`

### 4. **Chats Collection**:

- Each document represents a chat between two users who have matched.
- Document fields:
  - `user1Id`
  - `user2Id`
  - `lastMessageTimestamp`

### 5. **Messages Sub-collection (for each chat)**:

- Each document represents a message.
- Document fields:
  - `senderId`
  - `content`
  - `timestamp`

## Operations:

1. **User liking/disliking another user**:

   - Add a new document to the `interactions` sub-collection of the current user.

2. **List of potential matches**:

   - Fetch all users but exclude those in the current user's `interactions` sub-collection.

3. **View all matches**:

   - Fetch all documents from the current user's `matches` sub-collection.

4. **View all users liked**:

   - Query the `interactions` sub-collection for documents with `interactionType` set to 'like'.

5. **View all users disliked**:

   - Query the `interactions` sub-collection for documents with `interactionType` set to 'dislike'.

6. **View all users who liked the current user**:

   - This is a bit tricky. For each user in the app, check their `interactions` sub-collection to see if they've liked the current user. This can be costly in reads.

7. **Chat between matched users**:

   - Check if a chat document exists in the `chats` collection for the two users. If not, create one.
   - Add messages to the `messages` sub-collection of the chat.

8. **Unmatching**:
   - Delete the mutual match document from the `matches` sub-collection for both users. Optionally, delete the chat or mark it as inactive.

## Additional Considerations:

- The design of the interactions and matches as sub-collections allows for user-specific queries and prevents massive global collections. However, querying who liked the current user is not as straightforward and might require a different strategy or caching mechanism.
- Firestore's security rules should be tightly configured, especially for a dating app where privacy is paramount.

- Using Firestore's compound queries and indexing can speed up searches and make queries more efficient.

- Since real-time updates can be essential for a chat feature, consider using Firebase Realtime Database or Firestore's real-time listeners.

- Ensure data integrity by using Firestore's transactional operations when updating multiple documents or collections simultaneously.

Building such an app requires careful consideration of user experience, data integrity, and scalability. The structure provided is a starting point, but you might need to adapt and modify it based on user needs and application nuances.

[
{
"matchedPersonData": {
"created_time": {
"\_seconds": 1695732726,
"\_nanoseconds": 642000000
},
"uid": "OBmMdXFDQSfPvfVh47hZtIlsssb2",
"city": "Beersheba",
"description": "Testimonium avarus annus super adficio.",
"display_name": "Molly",
"email": "user2@gmail.com",
"year_of_birth": 1973,
"aditional_photos": [
"https://firebasestorage.googleapis.com/v0/b/tinder-app-af33b.appspot.com/o/users%2FOBmMdXFDQSfPvfVh47hZtIlsssb2%2Fuploads%2F1695733090278000_0.jpeg?alt=media&token=124875d7-d337-4784-86a4-e93f59a41a3f"
],
"userInterestInGender": "Female",
"gender": "Male"
},
"lastMessage": {
"senderId": "OBmMdXFDQSfPvfVh47hZtIlsssb2",
"content": " what are you up to ?",
"timestamp": {
"\_seconds": 1695736097,
"\_nanoseconds": 91000000
}
},
"chatId": "Y5IAXYMiGzqUjsvCtKCi"
}
]

{
"senderId": "OBmMdXFDQSfPvfVh47hZtIlsssb2",
"content": " what are you up to ?",
"timestamp": {
"\_seconds": 1695736097,
"\_nanoseconds": 91000000
}
},

DB stracture:
users
-id
--uid: User ID.
--city: The city where the user is located (e.g., "Phoenix").
--created_time: The timestamp when the user's account was created (September 29, 2023 at 11:42:50 AM UTC-4).
--description: User's description or bio.
--display_name: User's display name (e.g., "Melinda").
--email: User's email address.
--gender: User's gender (e.g., "Female").
--userInterestInGender: User's interest in a specific gender (e.g., "Male").
--year_of_birth: User's year of birth (e.g., 1978).
--aditional_photos: An array of additional photo URLs.
--interactions (subcolection)
---id
----interactionType "like" (string)
----targetUserId "sdadsInhkPgabGf5RSp5r4CkMfL2" (string)
----timestamp September 29, 2023 at 12:55:59 PM UTC-4 (timestamp)

--notifications (subcolection)
---id
----content "You have a new match!" (string)
----fromUserId "X1d4kPCLVVQGDantRUyTNI9M3uo1" (string)
----timestamp September 29, 2023 at 10:12:55 PM UTC-4 (timestamp)
----type "match" (string)
----viewed false (boolean)

--matches (subcolection)
---id
----matchedUserId "sdadsInhkPgabGf5RSp5r4CkMfL2" (string)
----timestamp September 29, 2023 at 12:56:23 PM UTC-4 (timestamp)
----viewed false (boolean)

--usersWhoLikedMe (subcolection)
---id
----timestamp September 29, 2023 at 12:56:22 PM UTC-4 (timestamp)
---userId "sdadsInhkPgabGf5RSp5r4CkMfL2" (string)

another global collection:
chats:
-id
--lastMessageTimestamp September 29, 2023 at 12:58:43 PM UTC-4 (timestamp)
--user1Id "sdadsInhkPgabGf5RSp5r4CkMfL2" (string)
--user2Id "luTmNoo5rlNPpVnOcCqWdk45lWZ2" (string)
--messages (subcolection)
---id
----content "hey how are you ?" (string)
----senderId "sdadsInhkPgabGf5RSp5r4CkMfL2" (string)
----timestamp September 29, 2023 at 12:58:43 PM UTC-4 (timestamp)
