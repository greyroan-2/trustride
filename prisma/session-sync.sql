-- Only the account owner can receive its session invalidation notifications.
-- Browsers receive only; publishing is restricted to the server/operator role.
CREATE POLICY trustride_receive_session_events
ON realtime.messages FOR SELECT TO authenticated
USING (
  extension = 'broadcast'
  AND (SELECT realtime.topic()) = 'trustride:auth:' || (SELECT auth.uid())::text
);
