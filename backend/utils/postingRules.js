const getDailyPostLimit = (friendCount) => {
    const count = Number(friendCount);
    if (!Number.isFinite(count) || count <= 0) return 0;
    if (count === 1) return 1;
    if (count <= 5) return 2;
    if (count <= 10) return 5;
    return null;
};

module.exports = { getDailyPostLimit };
