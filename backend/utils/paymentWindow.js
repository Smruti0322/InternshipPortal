const isSubscriptionPaymentWindowOpen = (date = new Date()) => {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    }).formatToParts(date);

    const hour = Number(parts.find((part) => part.type === "hour").value);
    const minute = Number(parts.find((part) => part.type === "minute").value);
    const minutes = hour * 60 + minute;

    // The permitted window includes the 11:45 PM minute in India.
    return minutes >= 300 && minutes <= 1425;
};

module.exports = { isSubscriptionPaymentWindowOpen };
