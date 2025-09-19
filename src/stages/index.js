const LOCALE = 'fr-FR'

window.addEventListener('onWidgetLoad', async (obj) => {
  const status = await SE_API.getOverlayStatus();
  const fieldData = obj.detail.fieldData;
  const projectId = fieldData["projectNumericalId"];

  if (!projectId) {
    console.error(`[/v1/projects/] Expected a valid project ID, got ${projectId} instead`);
    if (status.isEditorMode) {
      $('.stages-amount').html(`<div>Please input a valid project ID</div>`);
    }
    return
  };
  console.log('[/v1/projects/] Widget loaded for project', projectId);

  let amount;
  let currentStage;
  const url = `https://api.ulule.com/v1/projects/${projectId}?extra_fields=stages`;
  const refreshInterval = fieldData["refreshInterval"] * 1000 || 10000;

  fetchStats();
  setInterval(async () => {
    fetchStats();
  }, refreshInterval);

  async function fetchStats() {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`[v1/projects/${projectId}?extra_fields=stages] Response status: ${response.status}`);
      }
      const {
        stages,
        committed,
        goal,
        goal_raised: goalRaised
      } = await response.json();

      if (!goalRaised) {
        $('.stages-amount').html(`<div>Goal not reached</div>`);
        return;
      }

      if (!stages) {
        let foundCurrentStage = stages.find(element => {
          return element.status == "ongoing";
        });
        if (!foundCurrentStage) {
          $('.stages-amount').html(`<div>Project has no ongoing stage</div>`);
          return;
        }
        currentStage = foundCurrentStage[0];
      } else {
        $('.stages-amount').html(`<div>Project has no stages</div>`);
        return;
      }

      const suffix = fieldData["usedSuffix"] ? fieldData["currency"] : fieldData["presaleSuffix"];

      $({ amount: amount }).animate({ amount: committed }, {
        duration: 3000,
        easing: 'swing',
        step: function () {
          const goalElement = goal > 0 ? `<span class="stages-amount__goal"> / ${currentStage.goal.toLocaleString(LOCALE)} ${suffix}<span></div>` : '';
          $('.stages-amount').html(`<div>${Math.round(this.amount).toLocaleString(LOCALE)} ${goalElement}`);
        }
      });
      amount = committed;

      if (goal > 0) {
        const progress = Math.floor(committed / currentStage.goal * 100);
        $(".stages-progress-bar").show();
        $(".stages-progress-bar__content").animate({
          width: `${progress > 100 ? 100 : progress}%`,
        }, 1000);
        $(".stages-progress-bar__content").text(`${progress}%`);
      }
    } catch (error) {
      console.error(`[v1/projects/${projectId}?extra_fields=stages] Failed to fetch project`, error.message);
    }
  }
});
