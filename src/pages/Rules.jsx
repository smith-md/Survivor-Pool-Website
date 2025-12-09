import './Rules.css'

function Rules() {
  return (
    <div className="rules-page">
      <h1>Pool Rules</h1>

      <div className="rules-container">
        <section className="rule-section">
          <div className="rule-header">
            <h2>Game Format</h2>
          </div>
          <ul className="rule-list">
            <li><strong>2-Loss Elimination:</strong> Players are eliminated after accumulating 2 strikes (losses)</li>
            <li><strong>18 Weeks:</strong> Pool runs for the entire NFL regular season (Weeks 1-18)</li>
            <li><strong>One Pick Per Week:</strong> Select exactly one NFL team each week that you believe will win their game</li>
          </ul>
        </section>

        <section className="rule-section">
          <div className="rule-header">
            <h2>Pick Requirements</h2>
          </div>
          <ul className="rule-list">
            <li><strong>No Team Reuse:</strong> Once you pick a team, you cannot pick them again for the rest of the season</li>
            <li><strong>Weekly Deadline:</strong> All picks must be submitted before the first game of each week kicks off</li>
            <li><strong>Win/Loss Only:</strong> Your team must win their game (ties count as losses)</li>
            <li><strong>Team Selection Strategy:</strong> Plan ahead - you need to carefully manage which teams you use throughout the 18-week season</li>
          </ul>
        </section>

        <section className="rule-section">
          <div className="rule-header">
            <h2>Strikes & Elimination</h2>
          </div>
          <ul className="rule-list">
            <li><strong>Strike Earned:</strong> You receive a strike when your picked team loses their game</li>
            <li><strong>Two Strikes = Out:</strong> Accumulating 2 strikes eliminates you from the pool (unless you use the buyback option to get a 3rd strike)</li>
            <li><strong>Three Strikes with Buyback:</strong> If you buy back after 2 strikes, you get one more chance - 3 strikes and you're permanently eliminated</li>
          </ul>
        </section>

        <section className="rule-section highlight-section">
          <div className="rule-header">
            <h2>Buyback Option</h2>
          </div>
          <ul className="rule-list">
            <li><strong>One-Time Opportunity:</strong> After receiving your 2nd strike, you have the option to buy back into the pool</li>
            <li><strong>Buyback Fee:</strong> $20 to re-enter</li>
            <li><strong>Third Strike:</strong> Buying back gives you a 3rd and final strike opportunity (you still have your 2 strikes, but now can survive one more loss)</li>
            <li><strong>Teams Already Used:</strong> You keep your team usage history (cannot reuse teams you've already picked)</li>
            <li><strong>Final Elimination:</strong> This is a one-time option only - if you get your 3rd strike after buying back, you're eliminated for good</li>
          </ul>
        </section>

        <section className="rule-section">
          <div className="rule-header">
            <h2>Entry Fee</h2>
          </div>
          <ul className="rule-list">
            <li><strong>Entry Cost:</strong> $30 per player</li>
            <li><strong>Payment Required:</strong> Must be paid before picks are eligible</li>
            <li><strong>Total Pot Calculation:</strong> All entry fees ($30 each) + all buyback fees ($20 each) = Total Prize Pool</li>
          </ul>
        </section>

        <section className="rule-section highlight-section payout-section">
          <div className="rule-header">
            <h2>Payout Structure</h2>
          </div>
          <div className="payout-details">
            <p className="payout-intro">
              <strong>Winner Takes All:</strong> The last team(s) standing wins the entire prize pool.
            </p>

            <div className="payout-scenario">
              <h3>If Multiple Players Survive to End of Season:</h3>
              <ol className="payout-priority">
                <li>
                  <strong>Priority 1 - Zero Strikes Win:</strong>
                  <p>If any players finish with 0 strikes, they split the entire pot equally</p>
                  <p className="example">Example: If 3 players finish with 0 strikes, each gets 1/3 of the pot</p>
                </li>
                <li>
                  <strong>Priority 2 - All Active Players Split:</strong>
                  <p>If no 0-strike players exist, all remaining active players split the pot equally</p>
                  <p className="example">Example: If no 0-strike players remain, but 5 active players exist (mix of 1-strike and 2-strike-with-buyback), each gets 1/5 of the pot</p>
                </li>
              </ol>
            </div>

            <div className="payout-note">
              <strong>Important:</strong> Players with 1 strike and players with 2 strikes who bought back are treated equally in the final payout split if no 0-strike players remain.
            </div>
          </div>
        </section>

        <section className="rule-section">
          <div className="rule-header">
            <h2>Additional Information</h2>
          </div>
          <ul className="rule-list">
            <li><strong>Automated Scoring:</strong> Game results are automatically fetched from ESPN and updated throughout game days</li>
            <li><strong>Live Updates:</strong> Check the Pool page to see real-time standings and weekly picks</li>
            <li><strong>Transparency:</strong> All player picks and results are visible to all participants</li>
            <li><strong>Questions?</strong> Contact the pool administrator for any clarifications or disputes</li>
          </ul>
        </section>
      </div>
    </div>
  )
}

export default Rules
