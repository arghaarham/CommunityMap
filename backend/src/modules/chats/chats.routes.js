const express = require("express");
const { getChatMessages, sendChatMessage } = require("./chats.service");
const { requireAuth } = require("../../middlewares/auth");
const { broadcast } = require("../../lib/broadcast");

const router = express.Router();

router.get("/:referenceCode", requireAuth, async (req, res, next) => {
  try {
    const messages = await getChatMessages(req.params.referenceCode, req.user);
    res.json({
      data: messages,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/:referenceCode", requireAuth, async (req, res, next) => {
  try {
    const message = await sendChatMessage(req.params.referenceCode, req.user, req.body?.body);

    broadcast(`chat:${req.params.referenceCode}`, "new-message", { message });

    res.status(201).json({
      data: message,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = { chatsRouter: router };
